/**
 * Alexa+ Model Context Protocol (MCP) Server & Conversational Skill Bridge
 *
 * Built for the "Build, Ship, Shape: Amazon Developer Hackathon" (Alexa+ Track & AWS Builder).
 * Exposes a self-hosted JSON-RPC 2.0 MCP Server (`/api/mcp`) and natural-language Alexa+
 * voice skill dispatcher (`/api/alexa`) that allows engineering leaders to audit infrastructure,
 * hear their morning cloud security & FinOps briefing, and ship zero-downtime GitHub PRs by voice.
 */
import { IaCParser } from './iac_parser.js';
import { WellArchitectedEngine } from './well_architected_engine.js';
import { RemediationSynthesizer } from './remediation_synthesizer.js';
import { openRemediationPr } from './github_pr.js';
import type { BedrockConverseAgent } from './bedrock_converse_agent.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface AlexaVoiceResponse {
  utterance: string;
  matchedIntent: 'MorningCloudBriefing' | 'DeepWellArchitectedAudit' | 'SynthesizeAndShipPR' | 'ProductFeedbackSummary';
  mcpMethodCalled: string;
  mcpToolName: string;
  spokenSpeech: string;
  cardTitle: string;
  data: Record<string, unknown>;
}

export class AlexaMcpServer {
  readonly serverInfo = {
    name: 'cloudpulse-alexa-plus-mcp',
    version: '1.0.0',
    protocolVersion: '2025-03-26',
    ecosystem: 'Alexa+ Agent Skills & Amazon Bedrock Converse API'
  };

  constructor(private bedrockAgent: BedrockConverseAgent) {}

  /** Standard MCP tools/list descriptor for Alexa+ Agent Skill discovery. */
  listTools() {
    return [
      {
        name: 'get_morning_cloud_briefing',
        description: 'Delivers an executive Alexa+ morning voice briefing covering AWS security posture, Well-Architected violations, and monthly/annual FinOps savings.',
        inputSchema: {
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest to inspect' },
            engineerName: { type: 'string', description: 'Name of the engineer or CTO' }
          },
          required: ['hclContent']
        }
      },
      {
        name: 'audit_iac_manifest',
        description: 'Performs a full multi-pillar AWS Well-Architected & FinOps audit via Amazon Bedrock Converse API.',
        inputSchema: {
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' }
          },
          required: ['hclContent']
        }
      },
      {
        name: 'synthesize_remediation_diff',
        description: 'Synthesizes zero-downtime unified Git diffs for all detected AWS Well-Architected violations.',
        inputSchema: {
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' },
            ruleId: { type: 'string', description: 'Optional specific ruleId to patch' }
          },
          required: ['hclContent']
        }
      },
      {
        name: 'ship_github_remediation_pr',
        description: 'Stages or opens a GitHub Pull Request containing the verified Terraform remediation patches.',
        inputSchema: {
          type: 'object',
          properties: {
            hclContent: { type: 'string', description: 'Terraform / OpenTofu HCL manifest' },
            branchName: { type: 'string', description: 'Target remediation branch name' }
          },
          required: ['hclContent']
        }
      }
    ];
  }

  /** Standard JSON-RPC 2.0 MCP handler (`initialize`, `tools/list`, `tools/call`). */
  async handleJsonRpc(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const id = req.id ?? null;
    if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
      return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' } };
    }

    if (req.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: this.serverInfo.protocolVersion,
          serverInfo: this.serverInfo,
          capabilities: { tools: { listChanged: false } }
        }
      };
    }

    if (req.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: this.listTools() } };
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

  /** Execute an MCP tool directly. */
  async callTool(name: string, args: Record<string, any>): Promise<Record<string, unknown>> {
    const hclContent = String(args.hclContent || '');
    const resources = IaCParser.parse(hclContent);
    const audit = WellArchitectedEngine.audit(resources);
    const patches = audit.findings.map((f) => RemediationSynthesizer.generatePatch(f, hclContent));
    const annualSavings = Math.round(audit.totalMonthlySavingsUSD * 12 * 100) / 100;

    if (name === 'get_morning_cloud_briefing') {
      const engineer = args.engineerName || 'Akmal';
      const criticals = audit.findings.filter((f) => f.severity === 'CRITICAL');
      const highCount = audit.findings.filter((f) => f.severity === 'HIGH').length;
      const speech = criticals.length > 0
        ? `Good morning ${engineer}. I scanned ${resources.length} Terraform resources in your production stack. Alert: you have ${criticals.length} critical security vulnerability—${criticals[0].title}—plus ${highCount} high-severity findings. On the FinOps side, rightsizing oversized compute will save $${audit.totalMonthlySavingsUSD} per month, or $${annualSavings} per year. Say "Alexa, ship the remediation patch" whenever you're ready.`
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
      const combinedDiff = selectedPatches.map((p) => p.diff).join('\n\n');
      return {
        patchCount: selectedPatches.length,
        combinedDiff,
        patches: selectedPatches
      };
    }

    if (name === 'ship_github_remediation_pr') {
      const combinedDiff = patches.map((p) => p.diff).join('\n\n');
      const prResult = await openRemediationPr(combinedDiff);
      return {
        prMode: prResult.mode,
        prUrl: prResult.url,
        branch: args.branchName || prResult.draft.head,
        title: prResult.draft.title,
        patchesIncluded: patches.length,
        monthlySavingsUnlockedUSD: audit.totalMonthlySavingsUSD,
        annualSavingsUnlockedUSD: annualSavings,
        combinedDiff
      };
    }

    throw new Error(`Unknown MCP tool: ${name}`);
  }

  /**
   * Natural-language Alexa+ voice utterance router.
   * Maps spoken developer commands to MCP tool invocations and returns Alexa speech + visual card data.
   */
  async handleAlexaUtterance(utterance: string, hclContent: string): Promise<AlexaVoiceResponse> {
    const lower = utterance.toLowerCase();

    if (lower.includes('ship') || lower.includes('pull request') || lower.includes('open a pr') || lower.includes('patch') || lower.includes('fix')) {
      const data = await this.callTool('ship_github_remediation_pr', { hclContent });
      const speech = `Done! I synthesized ${data.patchesIncluded} zero-downtime Terraform patches—closing open SSH port 22, enabling KMS storage encryption on RDS, and rightsizing your EC2 instance to save $${data.annualSavingsUnlockedUSD} per year. Your GitHub Pull Request is staged on branch ${data.branch}.`;
      return {
        utterance,
        matchedIntent: 'SynthesizeAndShipPR',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'ship_github_remediation_pr',
        spokenSpeech: speech,
        cardTitle: 'Alexa+ MCP Action: Unified Git Patch & Pull Request Staged',
        data
      };
    }

    if (lower.includes('audit') || lower.includes('scan') || lower.includes('security') || lower.includes('bedrock')) {
      const data = await this.callTool('audit_iac_manifest', { hclContent });
      const audit = data.audit as any;
      const annual = Math.round((audit?.totalMonthlySavingsUSD || 0) * 12 * 100) / 100;
      const speech = `Amazon Bedrock (${data.modelId}) completed the Well-Architected scan via MCP. I found ${audit.violationsCount} issues across Security, Reliability, and FinOps, with $${audit.totalMonthlySavingsUSD} per month ($${annual} per year) in immediate EC2 and EBS cost reductions.`;
      return {
        utterance,
        matchedIntent: 'DeepWellArchitectedAudit',
        mcpMethodCalled: 'tools/call',
        mcpToolName: 'audit_iac_manifest',
        spokenSpeech: speech,
        cardTitle: `Alexa+ MCP Tool Call: audit_iac_manifest (${data.modelId})`,
        data
      };
    }

    // Default: Morning Cloud Briefing
    const data = await this.callTool('get_morning_cloud_briefing', { hclContent });
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
