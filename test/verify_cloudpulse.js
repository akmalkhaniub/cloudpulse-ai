import assert from 'assert';
import { IaCParser } from '../src/iac_parser.js';
import { WellArchitectedEngine } from '../src/well_architected_engine.js';
import { RemediationSynthesizer } from '../src/remediation_synthesizer.js';

console.log('🧪 Starting CloudPulse AI Automated Verification Suite (Amazon Developer Hackathon)...\n');

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

// Test 1: HCL Ingestion & Parsing
console.log('1️⃣ Testing HCL Manifest Parsing...');
const resources = IaCParser.parse(sampleTerraformHCL);
assert(resources.length === 3, `Expected 3 resources, parsed ${resources.length}`);
assert(resources.some(r => r.type === 'aws_security_group'), 'Should parse security group');
assert(resources.some(r => r.type === 'aws_db_instance'), 'Should parse RDS instance');
assert(resources.some(r => r.type === 'aws_instance'), 'Should parse EC2 instance');
console.log(`   ✅ Parsed ${resources.length} resources into DAG nodes successfully.`);

// Test 2: Well-Architected Rule Auditing
console.log('2️⃣ Testing AWS Well-Architected Rule Audit Engine...');
const auditReport = WellArchitectedEngine.audit(resources);
assert(auditReport.violationsCount === 3, `Expected 3 violations, found ${auditReport.violationsCount}`);
assert(auditReport.totalMonthlySavingsUSD === 340.00, `Expected $340 savings, got ${auditReport.totalMonthlySavingsUSD}`);
console.log(`   🚨 Detected ${auditReport.violationsCount} violations:`);
for (const finding of auditReport.findings) {
  console.log(`      [${finding.severity}] ${finding.pillar} - ${finding.title} (${finding.resourceId})`);
}
console.log(`   💰 Total Projected Monthly Cost Reduction: $${auditReport.totalMonthlySavingsUSD}/month`);

// Test 3: Remediation Patch Synthesis
console.log('3️⃣ Testing Automated Remediation Patch Synthesis...');
const sshFinding = auditReport.findings.find(f => f.ruleId === 'SEC_OPEN_SSH_INGRESS');
const sshPatch = RemediationSynthesizer.generatePatch(sshFinding, sampleTerraformHCL);
assert(sshPatch.diff.includes('-    cidr_blocks = ["0.0.0.0/0"]'), 'Diff must remove 0.0.0.0/0');
assert(sshPatch.diff.includes('+    cidr_blocks = ["10.0.0.0/16"]'), 'Diff must add internal VPC CIDR');
console.log('   ✅ Generated Git Diff for Security Ingress Patch:');
console.log(sshPatch.diff.split('\n').slice(0, 8).map(l => '      ' + l).join('\n') + '\n      ...');

const ec2Finding = auditReport.findings.find(f => f.ruleId === 'COST_OVERPROVISIONED_EC2');
const ec2Patch = RemediationSynthesizer.generatePatch(ec2Finding, sampleTerraformHCL);
assert(ec2Patch.patchedContent.includes('t4g.xlarge'), 'Must replace with Graviton instance type');
console.log('   ✅ Cost Rightsizing Patch successfully verified.');

console.log('\n🎉 ALL CLOUDPULSE AI & AWS HACKATHON TESTS PASSED WITH 100% SUCCESS!\n');
