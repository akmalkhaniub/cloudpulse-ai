/**
 * RemediationSynthesizer - Generates unified Git patch diffs for detected violations.
 *
 * Patches are scoped to the offending resource block (by `type.name`), update an
 * existing attribute in place instead of duplicating it, and are rendered with an
 * LCS-based line diff so only the lines that actually change are marked.
 */
import { rightsizeTarget } from './well_architected_engine.js';
import { assessChangeRisk, type ChangeRisk } from './change_safety.js';

export interface FindingLike {
  ruleId: string;
  resourceId?: string;
  targetProp?: string;
}

export interface RemediationPatch {
  ruleId: string;
  resourceId?: string;
  description: string;
  /** false when the rule has no safe automatic fix (e.g. deleting an orphaned volume). */
  autoFixable: boolean;
  /** What happens when this fix is applied, and what a human must confirm. */
  risk: ChangeRisk;
  diff: string;
  patchedContent: string;
}

export interface CombinedRemediation {
  patchCount: number;
  ruleIds: string[];
  diff: string;
  patchedContent: string;
}

interface BlockSpan { start: number; end: number; bodyStart: number; }

/** Locate `resource "<type>" "<name>" { ... }` and return its span (brace-matched). */
function findResourceBlock(source: string, resourceId?: string, type?: string): BlockSpan | null {
  let re: RegExp;
  if (resourceId && resourceId.includes('.')) {
    const [t, n] = resourceId.split('.');
    re = new RegExp(`resource\\s+"${escapeRe(t)}"\\s+"${escapeRe(n)}"\\s*\\{`);
  } else if (type) {
    re = new RegExp(`resource\\s+"${escapeRe(type)}"\\s+"[^"]+"\\s*\\{`);
  } else {
    return null;
  }
  const m = re.exec(source);
  if (!m) return null;
  const bodyStart = m.index + m[0].length;
  let depth = 1;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return { start: m.index, end: i, bodyStart };
    }
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Set `attr = value` inside a resource block: replace if present, otherwise insert after the opening brace. */
function setAttribute(source: string, block: BlockSpan, attr: string, value: string): string {
  const body = source.slice(block.bodyStart, block.end);
  const attrRe = new RegExp(`^(\\s*)${escapeRe(attr)}(\\s*)=\\s*[^\\n#]*`, 'm');
  let newBody: string;
  if (attrRe.test(body)) {
    newBody = body.replace(attrRe, (_m, indent: string, pad: string) => `${indent}${attr}${pad}= ${value}`);
  } else {
    const indent = (/\n([ \t]+)\S/.exec(body)?.[1]) ?? '  ';
    // Align '=' with the block's existing top-level attributes (terraform fmt style).
    const keyWidths = [...body.matchAll(new RegExp(`^${indent}([A-Za-z_][A-Za-z0-9_]*)(\\s*)=`, 'gm'))]
      .map((mm) => mm[1].length + mm[2].length);
    // Use the block's most common alignment column, so one long key doesn't push everything right.
    const counts = new Map<number, number>();
    for (const w of keyWidths) counts.set(w, (counts.get(w) ?? 0) + 1);
    const common = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
    const width = Math.max(attr.length + 1, common);
    const line = `${indent}${attr.padEnd(width)}= ${value}\n`;
    newBody = body.endsWith('\n') ? body + line : `${body}\n${line}`;
  }
  return source.slice(0, block.bodyStart) + newBody + source.slice(block.end);
}

function withBlock(source: string, finding: FindingLike, type: string, fn: (block: BlockSpan) => string): string {
  const block = findResourceBlock(source, finding.resourceId, type);
  return block ? fn(block) : source;
}

export class RemediationSynthesizer {
  /** Apply one finding's fix to the source and return the patched source (unchanged if no safe auto-fix). */
  static applyFix(finding: FindingLike, source: string): { patched: string; description: string; autoFixable: boolean } {
    switch (finding.ruleId) {
      case 'SEC_OPEN_SSH_INGRESS': {
        // Use the VPC CIDR declared in the same manifest when there is one; otherwise a clearly marked placeholder.
        const vpcCidr = /resource\s+"aws_vpc"\s+"[^"]+"\s*\{[^}]*?cidr_block\s*=\s*"([0-9./]+)"/.exec(source)?.[1];
        const replacement = vpcCidr
          ? `["${vpcCidr}"] # Restricted to this stack's VPC CIDR`
          : '["10.0.0.0/16"] # TODO: set to your VPN or bastion CIDR';
        const patched = withBlock(source, finding, 'aws_security_group', (b) => {
          const body = source.slice(b.bodyStart, b.end).replace(
            /cidr_blocks(\s*)=\s*\["0\.0\.0\.0\/0"\]/g,
            `cidr_blocks$1= ${replacement}`
          );
          return source.slice(0, b.bodyStart) + body + source.slice(b.end);
        });
        return {
          patched,
          autoFixable: true,
          description: vpcCidr
            ? `Restricted SSH/RDP ingress from 0.0.0.0/0 to the VPC CIDR ${vpcCidr} found in this manifest.`
            : 'Restricted SSH/RDP ingress from 0.0.0.0/0 to a placeholder private CIDR (no aws_vpc found to infer from).'
        };
      }
      case 'SEC_UNENCRYPTED_DB': {
        const dbName = finding.resourceId?.split('.')[1] ?? 'db';
        let patched = withBlock(source, finding, 'aws_db_instance', (b) => setAttribute(source, b, 'storage_encrypted', 'true'));
        const set = (attr: string, value: string, onlyIfMissing = false) => {
          if (onlyIfMissing && new RegExp(`\\b${attr}\\s*=`).test(findBody(patched, finding, 'aws_db_instance'))) return;
          patched = withBlock(patched, finding, 'aws_db_instance', (b) => setAttribute(patched, b, attr, value));
        };
        set('kms_key_id', '"alias/aws/rds"', true);
        // Safety guard: this change replaces the database, so make Terraform snapshot it before deleting it.
        set('skip_final_snapshot', 'false');
        set('final_snapshot_identifier', `"${dbName}-pre-encryption"`);
        return { patched, autoFixable: true, description: 'Enabled KMS at-rest encryption on RDS, with a final-snapshot guard because this change replaces the database.' };
      }
      case 'REL_NO_MULTI_AZ_DB': {
        let patched = withBlock(source, finding, 'aws_db_instance', (b) => setAttribute(source, b, 'multi_az', 'true'));
        if (!/\bapply_immediately\s*=/.test(findBody(patched, finding, 'aws_db_instance'))) {
          patched = withBlock(patched, finding, 'aws_db_instance', (b) => setAttribute(patched, b, 'apply_immediately', 'false'));
        }
        return { patched, autoFixable: true, description: 'Enabled a Multi-AZ standby for RDS, deferred to the maintenance window.' };
      }
      case 'SEC_UNENCRYPTED_EBS': {
        const patched = withBlock(source, finding, 'aws_ebs_volume', (b) => setAttribute(source, b, 'encrypted', 'true'));
        return { patched, autoFixable: true, description: 'Enabled at-rest encryption on the EBS volume.' };
      }
      case 'COST_OVERPROVISIONED_EC2': {
        let target = '';
        const patched = withBlock(source, finding, 'aws_instance', (b) => {
          const body = source.slice(b.bodyStart, b.end).replace(
            /instance_type(\s*)=\s*"([a-z0-9]+\.(?:4|8)xlarge)"/,
            (m, pad: string, current: string) => {
              target = rightsizeTarget(current) ?? '';
              return target ? `instance_type${pad}= "${target}" # Same x86 family, so the current AMI still boots` : m;
            }
          );
          return source.slice(0, b.bodyStart) + body + source.slice(b.end);
        });
        return { patched, autoFixable: Boolean(target), description: target ? `Rightsized the instance to ${target} within the same CPU family.` : 'No known rightsizing target for this instance type.' };
      }
      default:
        return { patched: source, autoFixable: false, description: 'No safe automatic fix; flagged for manual review.' };
    }
  }

  /** Synthesize a precise code patch diff for a given violation. */
  static generatePatch(finding: FindingLike, originalSource: string): RemediationPatch {
    const { patched, description, autoFixable } = this.applyFix(finding, originalSource);
    const changed = patched !== originalSource;
    return {
      ruleId: finding.ruleId,
      resourceId: finding.resourceId,
      description,
      autoFixable: autoFixable && changed,
      risk: assessChangeRisk(finding.ruleId),
      diff: changed ? this.createUnifiedDiff(originalSource, patched) : '',
      patchedContent: patched
    };
  }

  /** Apply every auto-fixable finding in sequence and return ONE applicable unified diff. */
  static generateCombinedPatch(
    findings: FindingLike[],
    originalSource: string,
    include: (ruleId: string) => boolean = () => true
  ): CombinedRemediation {
    let current = originalSource;
    const ruleIds: string[] = [];
    for (const f of findings) {
      if (!include(f.ruleId)) continue;
      const { patched } = this.applyFix(f, current);
      if (patched !== current) {
        ruleIds.push(f.ruleId);
        current = patched;
      }
    }
    return {
      patchCount: ruleIds.length,
      ruleIds,
      diff: ruleIds.length ? this.createUnifiedDiff(originalSource, current) : '',
      patchedContent: current
    };
  }

  /** LCS-based unified diff with 3 lines of context and proper hunk headers. */
  static createUnifiedDiff(original: string, modified: string, fileName = 'main.tf', context = 3): string {
    // A last line without a trailing newline gets a sentinel so it never matches a newline-terminated line.
    const NO_EOL = '\u0000';
    const toLines = (t: string) => {
      const l = t.split('\n');
      if (l[l.length - 1] === '') l.pop();
      else if (l.length) l[l.length - 1] += NO_EOL;
      return l;
    };
    const a = toLines(original);
    const b = toLines(modified);
    const n = a.length;
    const m = b.length;
    const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    type Op = { t: ' ' | '-' | '+'; line: string; ai: number; bi: number };
    const ops: Op[] = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { ops.push({ t: ' ', line: a[i], ai: i, bi: j }); i++; j++; }
      else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) { ops.push({ t: '-', line: a[i], ai: i, bi: j }); i++; }
      else { ops.push({ t: '+', line: b[j], ai: i, bi: j }); j++; }
    }

    const changeIdx = ops.map((o, k) => (o.t === ' ' ? -1 : k)).filter((k) => k >= 0);
    if (changeIdx.length === 0) return '';

    // Group changes into hunks separated by more than 2*context unchanged lines.
    const hunks: Array<[number, number]> = [];
    let hs = Math.max(0, changeIdx[0] - context);
    let he = Math.min(ops.length - 1, changeIdx[0] + context);
    for (const k of changeIdx.slice(1)) {
      if (k - context <= he + 1) he = Math.min(ops.length - 1, k + context);
      else { hunks.push([hs, he]); hs = Math.max(0, k - context); he = Math.min(ops.length - 1, k + context); }
    }
    hunks.push([hs, he]);

    let out = `--- a/${fileName}\n+++ b/${fileName}\n`;
    for (const [s, e] of hunks) {
      const slice = ops.slice(s, e + 1);
      const aCount = slice.filter((o) => o.t !== '+').length;
      const bCount = slice.filter((o) => o.t !== '-').length;
      const aStart = aCount ? slice[0].ai + 1 : slice[0].ai;
      const bStart = bCount ? slice[0].bi + 1 : slice[0].bi;
      out += `@@ -${aStart},${aCount} +${bStart},${bCount} @@\n`;
      for (const o of slice) {
        out += o.line.endsWith(NO_EOL)
          ? `${o.t}${o.line.slice(0, -1)}\n\\ No newline at end of file\n`
          : `${o.t}${o.line}\n`;
      }
    }
    return out;
  }
}

function findBody(source: string, finding: FindingLike, type: string): string {
  const b = findResourceBlock(source, finding.resourceId, type);
  return b ? source.slice(b.bodyStart, b.end) : '';
}
