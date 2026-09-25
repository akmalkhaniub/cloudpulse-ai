import assert from 'assert';
import { IaCParser } from '../src/iac_parser.js';
import { WellArchitectedEngine, rightsizingSavingsUSD } from '../src/well_architected_engine.js';
import { RemediationSynthesizer } from '../src/remediation_synthesizer.js';
import { BedrockConverseAgent } from '../src/bedrock_converse_agent.js';
import { openRemediationPr } from '../src/github_pr.js';

console.log('🧪 Starting CloudPulse AI Automated Verification Suite (Amazon Developer Hackathon 2026)...\n');

const sampleTerraformHCL = `
resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Security group with open inbound SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "app_db" {
  allocated_storage = 100
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  storage_encrypted = false
}

resource "aws_instance" "batch_processor" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "m5.4xlarge"
}
`.trim();

console.log('1️⃣ Testing HCL Manifest Parsing...');
const resources = IaCParser.parse(sampleTerraformHCL);
assert(resources.length === 3, `Expected 3 resources, parsed ${resources.length}`);
assert(resources.some((r) => r.type === 'aws_security_group'), 'Should parse security group');
assert(resources.some((r) => r.type === 'aws_db_instance'), 'Should parse RDS instance');
assert(resources.some((r) => r.type === 'aws_instance'), 'Should parse EC2 instance');
console.log(`   ✅ Parsed ${resources.length} resources into DAG nodes successfully.`);

console.log('2️⃣ Testing AWS Well-Architected Rule Audit Engine...');
const auditReport = WellArchitectedEngine.audit(resources);
assert(auditReport.violationsCount === 4, `Expected 4 violations, found ${auditReport.violationsCount}`);
const expectedSavings = rightsizingSavingsUSD('m5.4xlarge');
assert(auditReport.totalMonthlySavingsUSD === expectedSavings, `Expected $${expectedSavings} from the price table, got ${auditReport.totalMonthlySavingsUSD}`);
console.log(`   💰 Total Projected Monthly Cost Reduction: $${auditReport.totalMonthlySavingsUSD}/month`);

console.log('3️⃣ Testing Automated Remediation Patch Synthesis...');
const sshFinding = auditReport.findings.find((f) => f.ruleId === 'SEC_OPEN_SSH_INGRESS')!;
const sshPatch = RemediationSynthesizer.generatePatch(sshFinding, sampleTerraformHCL);
assert(sshPatch.diff.includes('-    cidr_blocks = ["0.0.0.0/0"]'), 'Diff must remove 0.0.0.0/0');
assert(sshPatch.diff.includes('+    cidr_blocks = ["10.0.0.0/16"]'), 'Diff must add internal VPC CIDR');
console.log('   ✅ Generated Git Diff for Security Ingress Patch.');

console.log('4️⃣ Testing Amazon Bedrock Converse API Agent...');
const bedrockAgent = new BedrockConverseAgent({ modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0' });
assert(bedrockAgent.toolConfig.tools.length === 3, 'Must define 3 Converse API tools');
assert(bedrockAgent.toolConfig.tools[0].toolSpec.name === 'audit_iac_manifest', 'Tool 1 must be audit_iac_manifest');
console.log('   🤖 Bedrock Converse Model:', bedrockAgent.modelId);

console.log('5️⃣ Testing Bedrock Converse Conversation Turn & Tool Invocation...');
const converseResult = await bedrockAgent.runConverseTurn('Inspect this Terraform file, find security flaws, and calculate cost savings.', sampleTerraformHCL);
assert(converseResult.output.message.role === 'assistant', 'Response must be from assistant');
assert(converseResult.toolCalls.length > 0, 'Agent must trigger tool calling');
assert(converseResult.toolCalls[0].name === 'audit_iac_manifest', 'Tool call must invoke audit tool');
assert(converseResult.audit.violationsCount === 4, 'Converse turn must surface all 4 violations');
console.log('   ⚡ Tool Call Triggered:', converseResult.toolCalls[0].name);

console.log('6️⃣ Testing FinOps Tool Calculation...');
const finopsResult = bedrockAgent.executeTool('estimate_finops_savings', { violations: auditReport.findings }) as any;
assert(finopsResult.projectedMonthlySavingsUSD === expectedSavings, 'Monthly savings must match the price table');
assert(finopsResult.annualizedSavingsUSD === Math.round(expectedSavings * 12 * 100) / 100, 'Annualized savings must be 12x the monthly table');
console.log(`   📈 Projected FinOps Annual Savings: $${finopsResult.annualizedSavingsUSD}/year`);

console.log('7️⃣ Testing Batch Zero-Downtime Patch Generation...');
assert(converseResult.patches.length === 4, 'Must generate patches for all 4 violations');
console.log(`   🛠️ Generated ${converseResult.patches.length} compliant Terraform remediation patches.`);

console.log('8️⃣ Testing remediation PR dry-run (no GitHub token)...');
delete process.env.GITHUB_TOKEN;
const pr = await openRemediationPr(sshPatch.diff);
assert(pr.mode === 'dry-run' && pr.url === null, 'Without a token the PR must not be opened');
assert(pr.draft.patch.includes('10.0.0.0/16'), 'Dry-run payload keeps the patch');
console.log('   ✅ PR stayed a dry-run.');

console.log('\n🎉 ALL 8 CLOUDPULSE AI & BEDROCK CONVERSE TESTS PASSED WITH 100% SUCCESS!\n');
