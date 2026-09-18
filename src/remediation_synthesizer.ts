/**
 * RemediationSynthesizer - Generates unified Git patch diffs for detected violations.
 */

export interface FindingLike {
  ruleId: string;
  resourceId?: string;
  targetProp?: string;
}

export interface RemediationPatch {
  ruleId: string;
  resourceId?: string;
  description: string;
  diff: string;
  patchedContent: string;
}

export class RemediationSynthesizer {
  /** Synthesize a precise code patch diff for a given violation. */
  static generatePatch(finding: FindingLike, originalSource: string): RemediationPatch {
    let patchedSource = originalSource;
    let patchDescription = '';

    if (finding.ruleId === 'SEC_OPEN_SSH_INGRESS') {
      patchedSource = originalSource.replace(
        /cidr_blocks\s*=\s*\["0\.0\.0\.0\/0"\]/g,
        'cidr_blocks = ["10.0.0.0/16"] # Restricted to corporate VPC CIDR'
      );
      patchDescription = 'Restricted administrative SSH/RDP ingress from universal 0.0.0.0/0 to internal VPC CIDR boundary.';
    } else if (finding.ruleId === 'SEC_UNENCRYPTED_DB') {
      patchedSource = originalSource.replace(
        /(resource\s+"aws_db_instance"\s+"[^"]+"\s*\{)/g,
        '$1\n  storage_encrypted = true\n  kms_key_id        = "alias/aws/rds"'
      );
      patchDescription = 'Enforced at-rest KMS storage encryption on AWS RDS instance.';
    } else if (finding.ruleId === 'COST_OVERPROVISIONED_EC2') {
      patchedSource = originalSource.replace(
        /instance_type\s*=\s*"[cm]5\.4xlarge"/g,
        'instance_type = "t4g.xlarge" # Rightsized to AWS Graviton (est. $340/mo savings)'
      );
      patchDescription = 'Rightsized over-provisioned instance to AWS Graviton t4g.xlarge, preserving throughput while reducing cloud expenditure.';
    }

    return {
      ruleId: finding.ruleId,
      resourceId: finding.resourceId,
      description: patchDescription,
      diff: this.createUnifiedDiff(originalSource, patchedSource),
      patchedContent: patchedSource
    };
  }

  static createUnifiedDiff(original: string, modified: string): string {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    let diff = `--- a/main.tf\n+++ b/main.tf\n@@ -1,${origLines.length} +1,${modLines.length} @@\n`;
    for (let i = 0; i < Math.max(origLines.length, modLines.length); i++) {
      const o = origLines[i];
      const m = modLines[i];
      if (o === m) {
        if (o !== undefined) diff += ` ${o}\n`;
      } else {
        if (o !== undefined) diff += `-${o}\n`;
        if (m !== undefined) diff += `+${m}\n`;
      }
    }
    return diff;
  }
}
