import assert from 'assert';
import { IaCParser } from '../src/iac_parser.js';
import { WellArchitectedEngine } from '../src/well_architected_engine.js';
import { RemediationSynthesizer } from '../src/remediation_synthesizer.js';

console.log('🧪 Remediation patch correctness...');
let passed = 0;
const ok = (label: string, cond: boolean) => { assert(cond, label); passed++; console.log(`   ✅ ${label}`); };

const HCL = `resource "aws_security_group" "web_sg" {
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
}`;

const findings = WellArchitectedEngine.audit(IaCParser.parse(HCL)).findings;
const db = findings.find((f) => f.ruleId === 'SEC_UNENCRYPTED_DB')!;
const dbPatch = RemediationSynthesizer.generatePatch(db, HCL);
ok('RDS encryption flips the existing attribute instead of duplicating it',
  (dbPatch.patchedContent.match(/storage_encrypted/g) || []).length === 1 && /storage_encrypted\s*= true/.test(dbPatch.patchedContent));
ok('RDS diff only marks changed lines (1 flipped + kms key + 2 snapshot guards)',
  dbPatch.diff.split('\n').filter((l) => /^[-+](?![-+])/.test(l)).length === 5);

const multiAz = RemediationSynthesizer.generatePatch(findings.find((f) => f.ruleId === 'REL_NO_MULTI_AZ_DB')!, HCL);
ok('Multi-AZ finding produces a real patch', multiAz.autoFixable && /multi_az\s*= true/.test(multiAz.patchedContent));

const combined = RemediationSynthesizer.generateCombinedPatch(findings, HCL);
ok('combined patch includes every auto-fixable finding', combined.patchCount === 4);
ok('combined patch is a single file diff', (combined.diff.match(/^--- a\//gm) || []).length === 1);
const after = WellArchitectedEngine.audit(IaCParser.parse(combined.patchedContent));
ok('re-auditing the patched manifest leaves zero findings', after.violationsCount === 0);

const orphan = RemediationSynthesizer.generatePatch({ ruleId: 'COST_ORPHANED_EBS_VOLUME' }, HCL);
ok('rules without a safe auto-fix return no diff', orphan.autoFixable === false && orphan.diff === '');

console.log(`\n🎉 ALL ${passed} REMEDIATION ASSERTIONS PASSED.\n`);
