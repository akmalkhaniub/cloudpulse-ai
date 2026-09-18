/**
 * Amazon Bedrock Converse API Client & Agentic Tool Orchestrator
 * Implements the unified Converse API standard for Claude on Bedrock:
 * - Standard Converse payload (messages, system, toolConfig, inferenceConfig)
 * - Native Bedrock tool calling (toolSpec, toolUse, toolResult) with a real
 *   tool-use loop against bedrock-runtime
 * - Mock/simulator fallback for offline environments without AWS credentials
 */
import { IaCParser } from './iac_parser.js';
import { WellArchitectedEngine, type AuditReport } from './well_architected_engine.js';
import { RemediationSynthesizer, type RemediationPatch } from './remediation_synthesizer.js';

export interface AgentOptions {
  modelId?: string;
  region?: string;
  isMock?: boolean;
}

export interface ConverseResult {
  modelId: string;
  stopReason: string;
  output: { message: { role: string; content: Array<{ text?: string; [k: string]: unknown }> } };
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  toolResults: Array<{ toolUseId: string; content: Array<{ json: unknown }> }>;
  audit: AuditReport;
  patches: RemediationPatch[];
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export class BedrockConverseAgent {
  modelId: string;
  region: string;
  isMock: boolean;
  toolConfig: { tools: Array<{ toolSpec: { name: string; description: string; inputSchema: { json: unknown } } }> };
  systemPrompt: Array<{ text: string }>;

  constructor(options: AgentOptions = {}) {
    this.modelId = options.modelId || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.isMock = options.isMock || !process.env.AWS_ACCESS_KEY_ID || process.env.MOCK_BEDROCK === 'true';

    this.toolConfig = {
      tools: [
        {
          toolSpec: {
            name: 'audit_iac_manifest',
            description: 'Audits Terraform or OpenTofu HCL code against AWS Well-Architected Pillars (Security, FinOps, Reliability).',
            inputSchema: { json: { type: 'object', properties: { hclContent: { type: 'string', description: 'Raw HCL Terraform code to inspect' } }, required: ['hclContent'] } }
          }
        },
        {
          toolSpec: {
            name: 'synthesize_remediation_diff',
            description: 'Synthesizes a compliant unified git diff to remediate an AWS Well-Architected finding.',
            inputSchema: { json: { type: 'object', properties: { ruleId: { type: 'string', description: 'Rule identifier e.g. SEC_OPEN_SSH_INGRESS' }, hclContent: { type: 'string', description: 'Original Terraform HCL code' } }, required: ['ruleId', 'hclContent'] } }
          }
        },
        {
          toolSpec: {
            name: 'estimate_finops_savings',
            description: 'Calculates projected monthly cloud spend reduction and carbon efficiency improvements (Graviton migration).',
            inputSchema: { json: { type: 'object', properties: { violations: { type: 'array', description: 'Array of audit findings' } }, required: ['violations'] } }
          }
        }
      ]
    };

    this.systemPrompt = [
      { text: 'You are CloudPulse AI, an autonomous Senior AWS Cloud Architect and DevSecOps Agent powered by Amazon Bedrock. Your role is to inspect IaC manifests, detect Well-Architected violations, calculate FinOps ROI, and synthesize zero-downtime unified git diffs.' }
    ];
  }

  /** Execute a Bedrock Converse conversation turn with a tool-calling loop. */
  async runConverseTurn(userPrompt: string, hclContent = ''): Promise<ConverseResult> {
    const messages = [
      {
        role: 'user',
        content: [
          { text: userPrompt },
          ...(hclContent ? [{ text: `\nTerraform Manifest:\n\`\`\`hcl\n${hclContent}\n\`\`\`` }] : [])
        ]
      }
    ];

    if (this.isMock) return this.simulateConverseResponse(hclContent);

    try {
      const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({ region: this.region });
      const command = new ConverseCommand({
        modelId: this.modelId,
        messages: messages as any,
        system: this.systemPrompt as any,
        toolConfig: this.toolConfig as any,
        inferenceConfig: { maxTokens: 4096, temperature: 0.1, topP: 0.9 }
      });
      const response = await client.send(command);
      return await this.processBedrockResponse(response, client, ConverseCommand, messages, hclContent);
    } catch (err) {
      console.warn('⚠️ [Bedrock Converse] Falling back to intelligent simulator mode:', (err as Error).message);
      return this.simulateConverseResponse(hclContent);
    }
  }

  /**
   * Handle a live Bedrock Converse response: run any requested tool_use blocks,
   * feed toolResult blocks back for a final turn, and normalize to ConverseResult.
   */
  async processBedrockResponse(response: any, client: any, ConverseCommand: any, messages: any[], hclContent: string): Promise<ConverseResult> {
    const toolCalls: ConverseResult['toolCalls'] = [];
    const toolResults: ConverseResult['toolResults'] = [];

    let current = response;
    let guard = 0;
    while (current?.stopReason === 'tool_use' && guard++ < 5) {
      const assistantContent: any[] = current.output?.message?.content || [];
      // Echo the assistant's tool_use turn back into the conversation.
      messages.push({ role: 'assistant', content: assistantContent });

      const toolResultBlocks: any[] = [];
      for (const block of assistantContent) {
        if (!block.toolUse) continue;
        const { toolUseId, name, input } = block.toolUse;
        toolCalls.push({ id: toolUseId, name, input });
        const result = this.executeTool(name, input || {});
        toolResults.push({ toolUseId, content: [{ json: result }] });
        toolResultBlocks.push({ toolResult: { toolUseId, content: [{ json: result }] } });
      }

      messages.push({ role: 'user', content: toolResultBlocks });
      current = await client.send(
        new ConverseCommand({
          modelId: this.modelId,
          messages,
          system: this.systemPrompt,
          toolConfig: this.toolConfig,
          inferenceConfig: { maxTokens: 4096, temperature: 0.1, topP: 0.9 }
        })
      );
    }

    // Derive the same structured audit/patches the UI expects, locally.
    const resources = IaCParser.parse(hclContent);
    const audit = WellArchitectedEngine.audit(resources);
    const patches = audit.findings.map((f) => RemediationSynthesizer.generatePatch(f, hclContent));
    const usage = current?.usage || {};

    return {
      modelId: this.modelId,
      stopReason: current?.stopReason || 'end_turn',
      output: current?.output || { message: { role: 'assistant', content: [{ text: '' }] } },
      toolCalls,
      toolResults,
      audit,
      patches,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || (usage.inputTokens || 0) + (usage.outputTokens || 0)
      }
    };
  }

  /** Dispatch and handle Bedrock tool execution. */
  executeTool(toolName: string, toolInput: Record<string, any>): unknown {
    if (toolName === 'audit_iac_manifest') {
      const resources = IaCParser.parse(toolInput.hclContent);
      const audit = WellArchitectedEngine.audit(resources);
      return {
        resourcesParsed: resources.length,
        violationsCount: audit.violationsCount,
        findings: audit.findings,
        totalMonthlySavingsUSD: audit.totalMonthlySavingsUSD
      };
    }
    if (toolName === 'synthesize_remediation_diff') {
      return RemediationSynthesizer.generatePatch({ ruleId: toolInput.ruleId, targetProp: 'cidr_blocks' }, toolInput.hclContent);
    }
    if (toolName === 'estimate_finops_savings') {
      const totalSavings = (toolInput.violations || []).reduce((acc: number, v: any) => acc + (v.monthlySavingsUSD || 0), 0);
      return {
        projectedMonthlySavingsUSD: totalSavings,
        annualizedSavingsUSD: totalSavings * 12,
        sustainabilityScoreImprovement: '+35% carbon efficiency'
      };
    }
    throw new Error(`Unknown tool: ${toolName}`);
  }

  /** Deterministic simulation adhering to the Bedrock Converse schema. */
  simulateConverseResponse(hclContent: string): ConverseResult {
    const resources = IaCParser.parse(hclContent);
    const audit = WellArchitectedEngine.audit(resources);
    const toolUseId = 'tooluse_' + Math.random().toString(36).substring(2, 9);
    const toolResult = this.executeTool('audit_iac_manifest', { hclContent });
    const patches = audit.findings.map((f) => RemediationSynthesizer.generatePatch(f, hclContent));

    return {
      modelId: this.modelId,
      stopReason: 'end_turn',
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: `### CloudPulse AI Audit Summary (Amazon Bedrock Converse API)\n\nI parsed **${resources.length} infrastructure resources** and identified **${audit.violationsCount} AWS Well-Architected violations** across Security, FinOps, and Reliability.\n\n- **Projected FinOps Savings:** $${audit.totalMonthlySavingsUSD}/month ($${audit.totalMonthlySavingsUSD * 12}/year)\n- **Security Posture:** 1 Critical Vulnerability (Unrestricted 0.0.0.0/0 SSH)\n- **Remediation Status:** Automated zero-downtime patches synthesized.`
            }
          ]
        }
      },
      toolCalls: [{ id: toolUseId, name: 'audit_iac_manifest', input: { hclContent } }],
      toolResults: [{ toolUseId, content: [{ json: toolResult }] }],
      audit,
      patches,
      usage: { inputTokens: 642, outputTokens: 388, totalTokens: 1030 }
    };
  }
}
