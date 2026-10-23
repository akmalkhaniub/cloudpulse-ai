/**
 * Alexa+ Model Context Protocol (MCP) Server & Unified Amazon Ecosystem Bridge
 *
 * Built for the "Build, Ship, Shape: Amazon Developer Hackathon".
 * Unifies:
 *  - Alexa+ Track: Self-hosted JSON-RPC 2.0 MCP Server (`/api/mcp`) & voice dispatcher (`/api/alexa`)
 *  - Bee Wearable Track: Ambient architecture meeting transcript ingestion (`ingest_bee_meeting_transcript`)
 *  - Fire TV Track: 10-foot NOC / Engineering War-Room Wallboard telemetry (`get_firetv_wallboard_state`)
 *  - AWS Builder Track: Live Amazon Bedrock Converse API (`amazon.nova-pro-v1:0`) tool orchestration
 */
import { createHash } from 'node:crypto';
import { IaCParser } from './iac_parser.js';
import { WellArchitectedEngine } from './well_architected_engine.js';
import { RemediationSynthesizer } from './remediation_synthesizer.js';
import { openRemediationPr } from './github_pr.js';
import { assessChangeRisk, buildChangePlan, type ChangeRisk } from './change_safety.js';
import type { BedrockConverseAgent } from './bedrock_converse_agent.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, any>;
  _meta?: {
    'io.modelcontextprotocol/protocolVersion'?: string;
    [key: string]: unknown;
  };
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: Record<string, unknown> };
  _meta?: {
    'io.modelcontextprotocol/protocolVersion': string;
  };
}

export interface AlexaVoiceResponse {
  utterance: string;
  matchedIntent:
    | 'MorningCloudBriefing'
    | 'DeepWellArchitectedAudit'
    | 'SynthesizeAndShipPR'
    | 'ApproveDisruptiveChanges'
    | 'AssessChangeRisk'
    | 'BeeWearableMeetingSync'
    | 'FireTvWallboardLaunch';
  mcpMethodCalled: string;
  mcpToolName: string;
  spokenSpeech: string;
  cardTitle: string;
  data: Record<string, unknown>;
}

export interface BeeActionItem {
  speaker: string;
  quote: string;
  inferredRuleId: string;
  matchedInTerraform: boolean;
  remediationSummary: string;
}

export const SAMPLE_BEE_TRANSCRIPT = `[09:14:02] Sarah (SRE Lead): Morning team. Before Friday's cutover, I noticed our web security group still has port 22 SSH open to 0.0.0.0/0.
[09:14:19] Alex (Platform Eng): Good catch. Also, app_db Postgres in staging is running without storage encryption or Multi-AZ failover.
[09:14:41] Priya (FinOps): And please check batch_processor — it's sitting on an m5.4xlarge burning budget when a Graviton m7g.xlarge would cut costs by over $270 a month.`;

export const SUPPORTED_MCP_VERSIONS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'] as const;

const usd = (n: number): string =>
  '$' + (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

const FIX_PHRASES: Record<string, string> = {
  SEC_OPEN_SSH_INGRESS: 'closing public SSH/RDP ingress',
  SEC_UNENCRYPTED_DB: 'enabling KMS encryption on RDS',
  REL_NO_MULTI_AZ_DB: 'enabling RDS Multi-AZ',
  SEC_UNENCRYPTED_EBS: 'encrypting EBS volumes',
  COST_OVERPROVISIONED_EC2: 'rightsizing oversized EC2'
};

const RISK_PHRASES: Record<string, string> = {
  SEC_UNENCRYPTED_DB: 'encrypting the database will replace it',
  SEC_UNENCRYPTED_EBS: 'encrypting the EBS volume will replace it'
};

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases.join('');
  return phrases.slice(0, -1).join(', ') + ', and ' + phrases[phrases.length - 1];
}

function describeRisks(risks: ChangeRisk[]): string {
  return joinPhrases(risks.map((r) => RISK_PHRASES[r.ruleId] || `${r.ruleId} needs manual review`));
}

/**
 * True only for a clear approval: the sentence starts with an approval phrase ("yes", "approve",
 * "go ahead", ...) or explicitly says "approve", and it is not a question.
 */
export function isApprovalUtterance(text: string): boolean {
  const t = text.toLowerCase().trim().replace(/^(hey\s+)?alexa[,!.]?\s*/, '');
  if (t.includes('?') || /\b(whether|if)\b/.test(t)) return false;
  if (/^(yes|yeah|yep|approve|approved|i approve|confirm|confirmed|go ahead|proceed|do it)\b/.test(t)) return true;
  return /\bapprove\b/.test(t) && !/^(can|could|would|should|do|does|did|is|are|what|why|how|when)\b/.test(t);
}

function describeFixes(ruleIds: string[]): string {
  const phrases = [...new Set(ruleIds)].map((r) => FIX_PHRASES[r]).filter(Boolean);
  if (phrases.length <= 1) return phrases.join('');
  return phrases.slice(0, -1).join(', ') + ', and ' + phrases[phrases.length - 1];
}

type JsonType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
const obj = (props: Record<string, JsonType | JsonType[]>, required: string[] = Object.keys(props)) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: Object.fromEntries(Object.entries(props).map(([k, t]) => [k, { type: t }])),
  required
});

/** Output schemas that match exactly what callTool returns (checked by test/server_integration.ts). */
export const OUTPUT_SCHEMAS: Record<string, ReturnType<typeof obj>> = {
  get_morning_cloud_briefing: obj({
    briefingType: 'string', resourcesScanned: 'number', violationsCount: 'number', criticalCount: 'number',
    monthlySavingsUSD: 'number', annualSavingsUSD: 'number', spokenSpeech: 'string',
    findings: 'array', patches: 'array', changePlan: 'object'
  }),
  audit_iac_manifest: obj({
    modelId: 'string', bedrockMode: 'string', audit: 'object', patches: 'array', toolCalls: 'array', usage: 'object'
  }),
  synthesize_remediation_diff: obj({ patchCount: 'number', combinedDiff: 'string', patches: 'array', changePlan: 'object' }),
  assess_change_risk: obj({
    overallRisk: 'string', safeToShip: 'array', needsApproval: 'array', spokenSummary: 'string', patches: 'array'
  }),
  ship_github_remediation_pr: obj({
    prMode: 'string', prUrl: ['string', 'null'], branch: 'string', title: 'string', patchesIncluded: 'number',
    rulesRemediated: 'array', approvedDisruptive: 'boolean', heldBackForApproval: 'array', approvalRequired: 'boolean',
    shippedRisks: 'array', verification: 'object', prDescription: 'string', prDescriptionSource: 'string',
    prDescriptionLatencyMs: 'number', monthlySavingsUnlockedUSD: 'number', annualSavingsUnlockedUSD: 'number', combinedDiff: 'string'
  }),
  ingest_bee_meeting_transcript: obj({
    device: 'string', transcriptLines: 'number', extractedActionItems: 'array', verifiedInTerraformCount: 'number',
    monthlySavingsUSD: 'number', annualSavingsUSD: 'number', combinedDiff: 'string', patches: 'array'
  }),
  get_firetv_wallboard_state: obj({
    device: 'string', dpadNavigationSupported: 'boolean', remoteKeys: 'array', kpis: 'object', tiles: 'array'
  })
};

export class AlexaMcpServer {
  readonly serverInfo = {
    name: 'cloudpulse-alexa-plus-mcp',
    version: '1.2.0',
    protocolVersion: '2026-07-28',
    supportedProtocolVersions: SUPPORTED_MCP_VERSIONS,
    transportMode: 'stateless-streamable-http',
    ecosystem: 'Alexa+ MCP (2026-07-28) • Amazon Bee Wearable • Amazon Fire TV War-Room • AWS Bedrock Converse'
  };

  /**
   * Manifests (by SHA-256) whose disruptive fixes have been explained to the user by voice
   * (briefing, risk question, or a "fix it" that held changes back). "Approve" only works for these.
   */
  private readonly pendingApprovals = new Set<string>();

  constructor(private bedrockAgent: BedrockConverseAgent) {}

  /** MCP 2026-07-28 tools/list descriptor with title, JSON Schema 2020-12 inputSchema, outputSchema, and annotations. */
  listTools() {
    return this.toolDescriptors().map((t) => ({ ...t, outputSchema: OUTPUT_SCHEMAS[t.name] ?? t.outputSchema }));
  }

  private toolDescriptors() {
    return [
      {
        name: 'get_morning_cloud_briefing',
        title: 'Alexa+ Morning Cloud & FinOps Briefing',
        description: 'Delivers an executive Alexa+ morning voice briefing covering AWS security posture, Well-Architected violations, and monthly/annual FinOps savings.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest to inspect' },
            engineerName: { type: 'string', description: 'Name of the engineer or CTO' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            engineerName: { type: 'string' },
            overallScore: { type: 'number' },
            resourcesScanned: { type: 'number' },
            violationsCount: { type: 'number' },
            criticalCount: { type: 'number' },
            monthlySavingsUsd: { type: 'number' },
            annualSavingsUsd: { type: 'number' },
            spokenBriefing: { type: 'string' }
          },
          required: ['overallScore', 'violationsCount', 'monthlySavingsUsd', 'spokenBriefing']
        },
        annotations: {
          title: 'Morning Cloud Briefing',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'audit_iac_manifest',
        title: 'Multi-Pillar AWS Well-Architected & Bedrock Audit',
        description: 'Performs a full multi-pillar AWS Well-Architected & FinOps audit via Amazon Bedrock Converse API.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            overallScore: { type: 'number' },
            totalMonthlySavingsUsd: { type: 'number' },
            findingsCount: { type: 'number' },
            bedrockModelId: { type: 'string' },
            bedrockReply: { type: 'string' }
          },
          required: ['overallScore', 'totalMonthlySavingsUsd', 'findingsCount']
        },
        annotations: {
          title: 'Well-Architected Audit',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true
        }
      },
      {
        name: 'synthesize_remediation_diff',
        title: 'Terraform Remediation Diff Synthesizer',
        description: 'Synthesizes one applicable unified Git diff for the detected AWS Well-Architected violations, with a blast-radius assessment for each fix.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' },
            ruleId: { type: 'string', description: 'Optional specific ruleId to patch' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            patchesCount: { type: 'number' },
            combinedDiff: { type: 'string' }
          },
          required: ['patchesCount', 'combinedDiff']
        },
        annotations: {
          title: 'Synthesize Remediation Diff',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'assess_change_risk',
        title: 'Remediation Blast-Radius Assessment',
        description: 'Before anything ships: for each available fix, explains how AWS applies it (in place, restart, or replacement), downtime and data risk, the safety guards added to the patch, and whether a human must approve it.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            overallRisk: { type: 'string', enum: ['SAFE', 'CAUTION', 'DISRUPTIVE'] },
            safeToShip: { type: 'array' },
            needsApproval: { type: 'array' },
            spokenSummary: { type: 'string' }
          },
          required: ['overallRisk', 'safeToShip', 'needsApproval', 'spokenSummary']
        },
        annotations: {
          title: 'Assess Change Risk',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'ship_github_remediation_pr',
        title: 'Safety-Gated GitHub Remediation PR',
        description: 'Stages or opens ONE GitHub pull request with the verified fixes. Disruptive fixes (database or volume replacement) are held back unless approveDisruptive is true, which a client must only set after the user explicitly confirms.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' },
            branchName: { type: 'string', description: 'Target remediation branch name' },
            approveDisruptive: { type: 'boolean', description: 'Include fixes that replace resources. Only set after explicit user confirmation.', default: false }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            patchesCount: { type: 'number' },
            totalMonthlySavingsUsd: { type: 'number' },
            combinedDiff: { type: 'string' },
            spokenSummary: { type: 'string' }
          },
          required: ['patchesCount', 'combinedDiff', 'spokenSummary']
        },
        annotations: {
          title: 'Ship GitHub Remediation PR',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true
        }
      },
      {
        name: 'ingest_bee_meeting_transcript',
        title: 'Amazon Bee Wearable Standup Transcript Sync',
        description: 'Ingests an ambient standup/architecture meeting transcript from the Amazon Bee AI Wearable, extracts spoken cloud action items, cross-verifies them against Terraform AST, and stages remediation patches.',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            transcript: { type: 'string', description: 'Ambient meeting transcript captured by Amazon Bee wearable' },
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest to cross-reference' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            device: { type: 'string' },
            verifiedInTerraformCount: { type: 'number' },
            totalMonthlySavingsUsd: { type: 'number' },
            spokenSummary: { type: 'string' }
          },
          required: ['device', 'verifiedInTerraformCount', 'spokenSummary']
        },
        annotations: {
          title: 'Ingest Bee Wearable Standup',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      },
      {
        name: 'get_firetv_wallboard_state',
        title: 'Amazon Fire TV 10-Foot NOC War-Room Wallboard',
        description: 'Returns a 10-foot Amazon Fire TV NOC War-Room Wallboard payload formatted for D-Pad remote navigation (ArrowLeft/ArrowRight/Enter).',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' }
          },
          required: ['hclContent']
        },
        outputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            deviceTarget: { type: 'string' },
            dpadNavigationSupported: { type: 'boolean' },
            overallScore: { type: 'number' },
            monthlySavingsUsd: { type: 'number' },
            spokenSummary: { type: 'string' }
          },
          required: ['deviceTarget', 'dpadNavigationSupported', 'overallScore']
        },
        annotations: {
          title: 'Fire TV War-Room Wallboard',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false
        }
      }
    ];
  }

  /**
   * MCP 2026-07-28 Stateless JSON-RPC 2.0 handler with backwards-compatible `initialize` handshake.
   * Supports per-request `_meta["io.modelcontextprotocol/protocolVersion"]` version declaration.
   */
  async handleJsonRpc(req: JsonRpcRequest, headerProtocolVersion?: string): Promise<JsonRpcResponse> {
    const id = req?.id ?? null;
    if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
      return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' } };
    }

    const requestedVersion =
      req._meta?.['io.modelcontextprotocol/protocolVersion'] ??
      req.params?._meta?.['io.modelcontextprotocol/protocolVersion'] ??
      req.params?.protocolVersion ??
      headerProtocolVersion ??
      this.serverInfo.protocolVersion;

    const isSupported = typeof requestedVersion === 'string' && (SUPPORTED_MCP_VERSIONS as readonly string[]).includes(requestedVersion);
    // MCP lifecycle: on initialize, an unsupported client version is answered with the server's own version
    // (version negotiation). Other methods reject an unsupported per-request version.
    if (!isSupported && req.method !== 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `UnsupportedProtocolVersionError: Unsupported MCP protocol version '${requestedVersion}'`,
          data: {
            requestedVersion,
            supportedVersions: SUPPORTED_MCP_VERSIONS
          }
        }
      };
    }

    const activeVersion = isSupported ? (requestedVersion as string) : this.serverInfo.protocolVersion;
    const responseMeta = { 'io.modelcontextprotocol/protocolVersion': activeVersion };

    if (req.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          _meta: responseMeta,
          protocolVersion: activeVersion,
          serverInfo: this.serverInfo,
          capabilities: { tools: { listChanged: false } }
        }
      };
    }

    if (req.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { _meta: responseMeta, tools: this.listTools() }
      };
    }

    if (req.method === 'tools/call') {
      const toolName = req.params?.name;
      const args = req.params?.arguments || {};
      try {
        const payload = await this.callTool(toolName, args);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            _meta: responseMeta,
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            structuredContent: payload,
            isError: false
          }
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: (err as Error).message }
        };
      }
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }

  /** Parse an Amazon Bee wearable transcript and correlate spoken concerns with AST findings. */
  extractBeeActionItems(transcript: string, foundRuleIds: Set<string>): BeeActionItem[] {
    const lines = transcript.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rulesCatalog: Array<{ pattern: RegExp; ruleId: string; summary: string }> = [
      {
        pattern: /ssh|port\s*22|0\.0\.0\.0\/0|security\s*group/i,
        ruleId: 'SEC_OPEN_SSH_INGRESS',
        summary: 'Restrict SSH port 22 ingress from 0.0.0.0/0 to VPC CIDR 10.0.0.0/16'
      },
      {
        pattern: /encrypt|kms|storage_encrypted/i,
        ruleId: 'SEC_UNENCRYPTED_DB',
        summary: 'Enable KMS storage_encrypted = true on RDS instance'
      },
      {
        pattern: /multi-?az|failover|standby/i,
        ruleId: 'REL_NO_MULTI_AZ_DB',
        summary: 'Enable multi_az = true on RDS instance for high availability'
      },
      {
        pattern: /m5\.4xlarge|graviton|m7g|oversized|cost|budget|finops/i,
        ruleId: 'COST_OVERPROVISIONED_EC2',
        summary: 'Rightsize EC2 m5.4xlarge to Graviton3 m7g.xlarge'
      }
    ];

    const items: BeeActionItem[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const speakerMatch = line.match(/\]\s*([^:]+):\s*(.+)$/);
      const speaker = speakerMatch ? speakerMatch[1].trim() : 'Team Member';
      const quote = speakerMatch ? speakerMatch[2].trim() : line;

      for (const rule of rulesCatalog) {
        if (rule.pattern.test(quote) && !seen.has(rule.ruleId)) {
          seen.add(rule.ruleId);
          items.push({
            speaker,
            quote,
            inferredRuleId: rule.ruleId,
            matchedInTerraform: foundRuleIds.has(rule.ruleId),
            remediationSummary: rule.summary
          });
        }
      }
    }
    return items;
  }

  /** Execute an MCP tool directly. */
  async callTool(name: string, args: Record<string, any>): Promise<Record<string, unknown>> {
    const hclContent = String(args.hclContent || '');
    const resources = IaCParser.parse(hclContent);
    const audit = WellArchitectedEngine.audit(resources);
    const patches = audit.findings.map((f) => RemediationSynthesizer.generatePatch(f, hclContent));
    const combined = RemediationSynthesizer.generateCombinedPatch(audit.findings, hclContent);
    const annualSavings = Math.round(audit.totalMonthlySavingsUSD * 12 * 100) / 100;
    const plan = buildChangePlan(patches.filter((p) => p.autoFixable).map((p) => p.ruleId));

    if (name === 'get_morning_cloud_briefing') {
      const engineer = args.engineerName || 'Akmal';
      const criticals = audit.findings.filter((f) => f.severity === 'CRITICAL');
      const highCount = audit.findings.filter((f) => f.severity === 'HIGH').length;
      const speech = criticals.length > 0
        ? `Good morning ${engineer}. I scanned ${resources.length} Terraform resources in your production stack. Alert: you have ${plural(criticals.length, 'critical security vulnerability', 'critical security vulnerabilities')}—${criticals[0].title}—plus ${plural(highCount, 'high-severity finding', 'high-severity findings')}. On the FinOps side, rightsizing oversized compute will save ${usd(audit.totalMonthlySavingsUSD)} per month, or ${usd(annualSavings)} per year. ${plural(plan.safeToShip.length, 'fix is', 'fixes are')} safe to ship now${plan.needsApproval.length ? `, and ${plural(plan.needsApproval.length, 'needs', 'need')} your approval because ${describeRisks(plan.needsApproval)}` : ''}. Say "Alexa, fix it" when you're ready.`
        : `Good morning ${engineer}. All ${resources.length} Terraform resources passed critical security checks with zero high-risk exposures.`;

      return {
        briefingType: 'ALEXA_PLUS_MORNING_CLOUD_BRIEFING',
        resourcesScanned: resources.length,
        violationsCount: audit.violationsCount,
        criticalCount: criticals.length,
        monthlySavingsUSD: audit.totalMonthlySavingsUSD,
        annualSavingsUSD: annualSavings,
        spokenSpeech: speech,
        findings: audit.findings,
        patches,
        changePlan: plan
      };
    }

    if (name === 'assess_change_risk') {
      const lines = [
        plan.safeToShip.length ? `${plural(plan.safeToShip.length, 'fix is', 'fixes are')} safe to ship: ${describeFixes(plan.safeToShip.map((r) => r.ruleId))}.` : '',
        plan.needsApproval.length ? `${plural(plan.needsApproval.length, 'fix needs', 'fixes need')} your approval, because ${describeRisks(plan.needsApproval)}. I add a final-snapshot guard, but expect downtime.` : 'Nothing needs special approval.'
      ].filter(Boolean);
      return {
        overallRisk: plan.overallRisk,
        safeToShip: plan.safeToShip,
        needsApproval: plan.needsApproval,
        spokenSummary: lines.join(' '),
        patches
      };
    }

    if (name === 'audit_iac_manifest') {
      const converse = await this.bedrockAgent.runConverseTurn(
        'Perform an AWS Well-Architected & FinOps audit on this Terraform manifest.',
        hclContent
      );
      return {
        modelId: converse.modelId,
        bedrockMode: this.bedrockAgent.isMock ? 'simulator' : 'live',
        audit: converse.audit,
        patches: converse.patches,
        toolCalls: converse.toolCalls,
        usage: converse.usage
      };
    }

    if (name === 'synthesize_remediation_diff') {
      const targetRule = args.ruleId;
      const selectedPatches = targetRule
        ? patches.filter((p) => p.ruleId === targetRule)
        : patches;
      const combinedDiff = targetRule
        ? selectedPatches.map((p) => p.diff).filter(Boolean).join('\n')
        : combined.diff;
      return {
        patchCount: targetRule ? selectedPatches.filter((p) => p.autoFixable).length : combined.patchCount,
        combinedDiff,
        patches: selectedPatches,
        changePlan: plan
      };
    }

    if (name === 'ship_github_remediation_pr') {
      // Safety gate: disruptive fixes only ship after an explicit human "yes".
      const approveDisruptive = args.approveDisruptive === true;
      const chosen = RemediationSynthesizer.generateCombinedPatch(
        audit.findings,
        hclContent,
        (ruleId) => approveDisruptive || !assessChangeRisk(ruleId).requiresApproval
      );
      const shippedPlan = buildChangePlan(chosen.ruleIds);
      const shipped = [...shippedPlan.safeToShip, ...shippedPlan.needsApproval];
      const heldBack = approveDisruptive ? [] : plan.needsApproval;

      // Verify: re-audit the patched manifest and count what is left for the rules this PR claims to fix.
      const shippedSet = new Set(chosen.ruleIds);
      const after = WellArchitectedEngine.audit(IaCParser.parse(chosen.patchedContent));
      const verification = {
        findingsBefore: audit.findings.filter((f) => shippedSet.has(f.ruleId)).length,
        findingsAfter: after.findings.filter((f) => shippedSet.has(f.ruleId)).length,
        totalFindingsAfter: after.violationsCount
      };
      const monthly = Math.round(audit.findings.filter((f) => shippedSet.has(f.ruleId)).reduce((a, f) => a + f.monthlySavingsUSD, 0) * 100) / 100;

      const brief = await this.bedrockAgent.writeChangeBrief({
        shippedRisks: shipped,
        heldBackRisks: heldBack,
        monthlySavingsUSD: monthly,
        verification
      });
      const prResult = await openRemediationPr(chosen.diff, fetch, {
        title: brief.title,
        body: brief.markdown,
        ...(args.branchName ? { head: String(args.branchName) } : {})
      });
      return {
        prMode: prResult.mode,
        prUrl: prResult.url,
        branch: prResult.draft.head,
        title: prResult.draft.title,
        patchesIncluded: chosen.patchCount,
        rulesRemediated: chosen.ruleIds,
        approvedDisruptive: approveDisruptive,
        heldBackForApproval: heldBack,
        approvalRequired: heldBack.length > 0,
        shippedRisks: shipped,
        verification,
        prDescription: brief.markdown,
        prDescriptionSource: brief.narrativeSource,
        prDescriptionLatencyMs: brief.latencyMs,
        monthlySavingsUnlockedUSD: monthly,
        annualSavingsUnlockedUSD: Math.round(monthly * 12 * 100) / 100,
        combinedDiff: chosen.diff
      };
    }

    if (name === 'ingest_bee_meeting_transcript') {
      const transcript = String(args.transcript || SAMPLE_BEE_TRANSCRIPT);
      const foundRuleIds = new Set(audit.findings.map((f) => f.ruleId));
      const actionItems = this.extractBeeActionItems(transcript, foundRuleIds);
      const verifiedCount = actionItems.filter((a) => a.matchedInTerraform).length;
      const combinedDiff = combined.diff;

      return {
        device: 'Bee-style wearable transcript (concept: sample data, no live device)',
        transcriptLines: transcript.split(/\r?\n/).filter(Boolean).length,
        extractedActionItems: actionItems,
        verifiedInTerraformCount: verifiedCount,
        monthlySavingsUSD: audit.totalMonthlySavingsUSD,
        annualSavingsUSD: annualSavings,
        combinedDiff,
        patches
      };
    }

    if (name === 'get_firetv_wallboard_state') {
      return {
        device: 'Fire TV-style 10-foot wallboard (concept: browser prototype)',
        dpadNavigationSupported: true,
        remoteKeys: ['ArrowLeft', 'ArrowRight', 'Enter', 'Escape'],
        kpis: {
          resourcesMonitored: resources.length,
          activeViolations: audit.violationsCount,
          monthlySavingsUSD: audit.totalMonthlySavingsUSD,
          annualSavingsUSD: annualSavings,
          detectionF1: '1.000'
        },
        tiles: audit.findings.map((f, idx) => ({
          tileIndex: idx,
          ruleId: f.ruleId,
          severity: f.severity,
          pillar: f.pillar,
          title: f.title,
          monthlySavingsUSD: f.monthlySavingsUSD,
          patch: patches[idx]?.diff || ''
        }))
      };
    }

    throw new Error(`Unknown MCP tool: ${name}`);
  }

  /**
   * Natural-language Alexa+ voice utterance router.
   * Maps spoken developer commands to MCP tool invocations and returns Alexa speech + visual card data.
   */
  async handleAlexaUtterance(utterance: string, hclContent: string, extra: { transcript?: string } = {}): Promise<AlexaVoiceResponse> {
    const lower = utterance.toLowerCase();
    const has = (...words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
    const manifestKey = createHash('sha256').update(hclContent).digest('hex');

    // 1. Human approval of disruptive changes. Deliberately strict: a question that merely contains
    //    "confirm" or "yes" must never replace a database.
    if (isApprovalUtterance(lower)) {
      if (!this.pendingApprovals.has(manifestKey)) {
        // Nothing has been explained to the user for this manifest yet: explain first, ship nothing.
        const data = await this.callTool('assess_change_risk', { hclContent });
        const waiting = (data.needsApproval as ChangeRisk[]) || [];
        if (waiting.length) this.pendingApprovals.add(manifestKey);
        return {
          utterance,
          matchedIntent: 'AssessChangeRisk',
          mcpMethodCalled: 'tools/call',
          mcpToolName: 'assess_change_risk',
          spokenSpeech: waiting.length
            ? `Before I approve anything, here is what it would do. ${String(data.spokenSummary)} Say "approve" again to include ${waiting.length === 1 ? 'it' : 'them'}.`
            : 'There is nothing waiting for your approval. Every available fix is safe to ship. Say "fix it" to open the pull request.',
          cardTitle: waiting.length ? 'Review Before Approving' : 'Nothing to Approve',
          data
        };
      }
      this.pendingApprovals.delete(manifestKey);
      const data = await this.callTool('ship_github_remediation_pr', { hclContent, approveDisruptive: true });
      const hasSnapshotGuard = ((data.shippedRisks as ChangeRisk[]) || []).some((r) => r.guardsAdded.some((g) => g.startsWith('final_snapshot_identifier')));
      const v = data.verification as { findingsBefore: number; findingsAfter: number };
      const speech = `Approved. The pull request now includes all ${plural(Number(data.patchesIncluded), 'fix', 'fixes')}, including the database replacement${hasSnapshotGuard ? ', guarded by a final snapshot taken before the old database is deleted' : ''}. I re-scanned the patched code: ${v.findingsBefore} issues down to ${v.findingsAfter}. Please schedule a maintenance window before merging.`;
      return {
        utterance,
        matchedIntent: 'ApproveDisruptiveChanges',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'ship_github_remediation_pr',
        spokenSpeech: speech,
        cardTitle: 'Approved: Full Remediation PR (with safety guards)',
        data
      };
    }

    // 2. Blast-radius questions ("is it safe?", "what's the risk?", "what happens if...").
    const asksShip = has('ship', 'pr') || lower.includes('pull request');
    if (!asksShip && (has('risk', 'risky', 'safe', 'blast', 'downtime', 'break') || lower.includes('what happens'))) {
      const data = await this.callTool('assess_change_risk', { hclContent });
      if (((data.needsApproval as ChangeRisk[]) || []).length) this.pendingApprovals.add(manifestKey);
      return {
        utterance,
        matchedIntent: 'AssessChangeRisk',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'assess_change_risk',
        spokenSpeech: String(data.spokenSummary),
        cardTitle: 'Blast-Radius Assessment',
        data
      };
    }

    if (has('bee') || lower.includes('wearable') || lower.includes('meeting') || lower.includes('standup') || lower.includes('transcript')) {
      const data = await this.callTool('ingest_bee_meeting_transcript', {
        hclContent,
        transcript: extra.transcript || SAMPLE_BEE_TRANSCRIPT
      });
      const items = (data.extractedActionItems as BeeActionItem[]) || [];
      const speech = `I synced your Amazon Bee wearable recording from this morning's standup. I extracted ${items.length} spoken cloud action items and verified ${data.verifiedInTerraformCount} of them directly in your Terraform AST—with ${usd(Number(data.monthlySavingsUSD))} per month in potential savings. The combined patch is staged and ready for review.`;
      return {
        utterance,
        matchedIntent: 'BeeWearableMeetingSync',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'ingest_bee_meeting_transcript',
        spokenSpeech: speech,
        cardTitle: 'Amazon Bee Wearable Sync: Standup Transcript → Verified Terraform Patches',
        data
      };
    }

    if (lower.includes('fire tv') || lower.includes('firetv') || lower.includes('wallboard') || lower.includes('war room') || has('tv')) {
      const data = await this.callTool('get_firetv_wallboard_state', { hclContent });
      const kpis = data.kpis as Record<string, unknown>;
      const speech = `Launching Fire TV 10-foot Engineering War-Room mode. Displaying ${plural(Number(kpis.activeViolations), 'active Well-Architected finding', 'active Well-Architected findings')} and ${usd(Number(kpis.annualSavingsUSD))} in annual FinOps savings. Use your Fire TV remote left and right directional buttons to inspect each tile and press Select to view the patch.`;
      return {
        utterance,
        matchedIntent: 'FireTvWallboardLaunch',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'get_firetv_wallboard_state',
        spokenSpeech: speech,
        cardTitle: 'Amazon Fire TV 10-Foot NOC War-Room Wallboard Activated',
        data
      };
    }

    if (lower.includes('ship') || lower.includes('pull request') || lower.includes('open a pr') || lower.includes('patch') || lower.includes('fix')) {
      const data = await this.callTool('ship_github_remediation_pr', { hclContent });
      const fixed = describeFixes((data.rulesRemediated as string[]) || []);
      const v = data.verification as { findingsBefore: number; findingsAfter: number };
      const heldBack = (data.heldBackForApproval as ChangeRisk[]) || [];
      if (heldBack.length) this.pendingApprovals.add(manifestKey);
      const prPhrase = data.prMode === 'live' && data.prUrl
        ? `I opened a pull request at ${data.prUrl}`
        : `I staged a pull request on branch ${data.branch}`;
      const savings = Number(data.monthlySavingsUnlockedUSD) > 0 ? `, saving ${usd(Number(data.monthlySavingsUnlockedUSD))} a month` : '';
      const held = heldBack.length
        ? ` I held back ${plural(heldBack.length, 'change', 'changes')} that ${heldBack.length === 1 ? 'needs' : 'need'} your approval: ${describeRisks(heldBack)}. I've added a final-snapshot guard, but it means downtime. Say "approve" to include ${heldBack.length === 1 ? 'it' : 'them'}.`
        : '';
      const speech = `${prPhrase} with ${plural(Number(data.patchesIncluded), 'safe fix', 'safe fixes')}${fixed ? `: ${fixed}` : ''}${savings}. I re-scanned the patched code: ${v.findingsBefore} issues down to ${v.findingsAfter}.${held}`;
      return {
        utterance,
        matchedIntent: 'SynthesizeAndShipPR',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'ship_github_remediation_pr',
        spokenSpeech: speech,
        cardTitle: heldBack.length ? 'Safe Fixes Staged · Approval Needed' : 'Pull Request Staged',
        data
      };
    }

    if (lower.includes('audit') || lower.includes('scan') || lower.includes('security') || lower.includes('bedrock')) {
      const data = await this.callTool('audit_iac_manifest', { hclContent });
      const audit = data.audit as any;
      const annual = Math.round((audit?.totalMonthlySavingsUSD || 0) * 12 * 100) / 100;
      const speech = `Amazon Bedrock completed the Well-Architected scan via MCP. I found ${plural(audit.violationsCount, 'issue', 'issues')} across Security, Reliability, and Cost Optimization, with ${usd(audit.totalMonthlySavingsUSD)} per month (${usd(annual)} per year) in cost reductions.`;
      return {
        utterance,
        matchedIntent: 'DeepWellArchitectedAudit',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'audit_iac_manifest',
        spokenSpeech: speech,
        cardTitle: 'Alexa+ MCP Tool Call: audit_iac_manifest',
        data
      };
    }

    // Default: Morning Cloud Briefing
    const data = await this.callTool('get_morning_cloud_briefing', { hclContent });
    const briefPlan = data.changePlan as { needsApproval?: ChangeRisk[] } | undefined;
    if (briefPlan?.needsApproval?.length) this.pendingApprovals.add(manifestKey);
    return {
      utterance,
      matchedIntent: 'MorningCloudBriefing',
      mcpMethodCalled: 'tools/call',
      mcpToolName: 'get_morning_cloud_briefing',
      spokenSpeech: String(data.spokenSpeech),
      cardTitle: 'Alexa+ Morning CTO & DevSecOps Briefing',
      data
    };
  }
}
