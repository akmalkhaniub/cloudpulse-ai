import assert from 'assert';
import { IaCParser } from '../src/iac_parser.js';
import { WellArchitectedEngine, rightsizingSavingsUSD } from '../src/well_architected_engine.js';
import { RemediationSynthesizer } from '../src/remediation_synthesizer.js';
import { assessChangeRisk, buildChangePlan } from '../src/change_safety.js';
import { BedrockConverseAgent } from '../src/bedrock_converse_agent.js';
import { AlexaMcpServer, isApprovalUtterance } from '../src/alexa_mcp_server.js';

console.log('🧪 Change safety (blast radius) ...');
let passed = 0;
const ok = (label: string, cond: boolean) => { assert(cond, label); passed++; console.log(`   ✅ ${label}`); };

ok('RDS encryption is DISRUPTIVE (replacement) and needs approval',
  assessChangeRisk('SEC_UNENCRYPTED_DB').applyBehavior === 'replacement' && assessChangeRisk('SEC_UNENCRYPTED_DB').requiresApproval);
ok('closing SSH is SAFE and in place', assessChangeRisk('SEC_OPEN_SSH_INGRESS').level === 'SAFE');
ok('unknown rules default to manual + approval', assessChangeRisk('SOMETHING_NEW').requiresApproval);

const plan = buildChangePlan(['SEC_OPEN_SSH_INGRESS', 'COST_OVERPROVISIONED_EC2', 'SEC_UNENCRYPTED_DB']);
ok('change plan splits safe vs approval', plan.safeToShip.length === 2 && plan.needsApproval.length === 1 && plan.overallRisk === 'DISRUPTIVE');

const HCL = `resource "aws_vpc" "main" {
  cidr_block = "172.20.0.0/16"
}

resource "aws_security_group" "web" {
  ingress {
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "orders" {
  engine            = "postgres"
  storage_encrypted = false
  multi_az          = true
}

resource "aws_instance" "batch" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "m5.4xlarge"
}
`;
const findings = WellArchitectedEngine.audit(IaCParser.parse(HCL)).findings;
const fix = (rule: string) => RemediationSynthesizer.generatePatch(findings.find((f) => f.ruleId === rule)!, HCL);

ok('SSH fix uses the VPC CIDR declared in the manifest', fix('SEC_OPEN_SSH_INGRESS').patchedContent.includes('["172.20.0.0/16"]'));
const db = fix('SEC_UNENCRYPTED_DB').patchedContent;
ok('RDS fix adds a final-snapshot guard named after the database',
  /skip_final_snapshot\s*= false/.test(db) && db.includes('"orders-pre-encryption"'));
const ec2 = fix('COST_OVERPROVISIONED_EC2').patchedContent;
ok('EC2 rightsizing stays in the x86 family (AMI still boots)', ec2.includes('"m5.xlarge"') && !/t4g|m7g|graviton/i.test(ec2.split('#')[0]));
ok('savings use the same-family target price', rightsizingSavingsUSD('m5.4xlarge') === 420.48);
ok('each patch carries its risk assessment', fix('SEC_UNENCRYPTED_DB').risk.level === 'DISRUPTIVE');

const brief = await new BedrockConverseAgent({ isMock: true }).writeChangeBrief({
  shippedRisks: plan.safeToShip, heldBackRisks: plan.needsApproval, monthlySavingsUSD: 420.48,
  verification: { findingsBefore: 2, findingsAfter: 0 }
});
ok('PR description always contains the code-generated risk table and held-back section',
  brief.markdown.includes('| `SEC_OPEN_SSH_INGRESS` |') && brief.markdown.includes('Held back') && brief.narrativeSource === 'template');

// Approval must be explicit: questions that merely contain "confirm" / "yes" never approve a replacement.
ok('clear approvals are recognized',
  ['Alexa, approve the database change', 'Yes, go ahead', 'approve', 'Confirmed.', 'I approve the change'].every(isApprovalUtterance));
ok('questions and incidental words are NOT approvals',
  ['Can you confirm whether the database is encrypted?', 'Yes, what is my morning briefing?', 'Should I approve this?',
   'Can you approve it', 'Fix it', 'Is it safe to fix everything?'].every((u) => !isApprovalUtterance(u)));

const mcp = new AlexaMcpServer(new BedrockConverseAgent({ isMock: true }));
const cold = await mcp.handleAlexaUtterance('Alexa, approve the database change', HCL);
ok('"approve" with nothing explained yet ships nothing and explains first',
  cold.matchedIntent === 'AssessChangeRisk' && /approve" again/.test(cold.spokenSpeech));
const warm = await mcp.handleAlexaUtterance('Approve', HCL);
ok('a second "approve" after the explanation ships the guarded replacement',
  warm.matchedIntent === 'ApproveDisruptiveChanges' && (warm.data.rulesRemediated as string[]).includes('SEC_UNENCRYPTED_DB'));
const again = await mcp.handleAlexaUtterance('Approve', HCL);
ok('approval is consumed once (no repeat ship without a new explanation)', again.matchedIntent === 'AssessChangeRisk');

console.log(`\n🎉 ALL ${passed} CHANGE-SAFETY ASSERTIONS PASSED.\n`);
