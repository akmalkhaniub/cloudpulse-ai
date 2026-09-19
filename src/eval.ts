/**
 * Detection-quality evaluation for the Well-Architected rule engine.
 *
 * Audits a labeled Terraform fixture with a known set of planted violations and reports
 * precision / recall / F1 — a measurable number for "does the scanner find the real
 * issues without crying wolf." A clean fixture checks the false-positive rate.
 */
import { IaCParser } from './iac_parser.js';
import { WellArchitectedEngine } from './well_architected_engine.js';

export interface DetectionScore {
  precision: number;
  recall: number;
  f1: number;
  found: string[];
  expected: string[];
}

// A realistic multi-resource manifest with exactly these violations planted:
//   SEC_OPEN_SSH_INGRESS, SEC_UNENCRYPTED_DB, COST_OVERPROVISIONED_EC2, COST_ORPHANED_EBS_VOLUME
export const LABELED_TF = `
resource "aws_security_group" "web" {
  ingress { from_port = 22 to_port = 22 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_db_instance" "db" {
  engine = "postgres"
  storage_encrypted = false
}
resource "aws_instance" "batch" {
  instance_type = "m5.4xlarge"
}
resource "aws_ebs_volume" "orphan" {
  size = 200
  type = "gp3"
}
`.trim();

export const LABELED_TF_EXPECTED = [
  'SEC_OPEN_SSH_INGRESS',
  'SEC_UNENCRYPTED_DB',
  'REL_NO_MULTI_AZ_DB',
  'SEC_UNENCRYPTED_EBS',
  'COST_OVERPROVISIONED_EC2',
  'COST_ORPHANED_EBS_VOLUME',
];

// A compliant manifest — the scanner should raise nothing.
export const CLEAN_TF = `
resource "aws_security_group" "web" {
  ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["10.0.0.0/16"] }
}
resource "aws_db_instance" "db" {
  engine = "postgres"
  storage_encrypted = true
  multi_az = true
}
resource "aws_instance" "batch" {
  instance_type = "t4g.large"
}
`.trim();

export function scoreDetection(hcl: string, expected: string[]): DetectionScore {
  const resources = IaCParser.parse(hcl);
  const audit = WellArchitectedEngine.audit(resources);
  const found = Array.from(new Set(audit.findings.map((f) => f.ruleId)));
  const exp = new Set(expected);
  const tp = found.filter((r) => exp.has(r)).length;
  const fp = found.filter((r) => !exp.has(r)).length;
  const fn = expected.filter((r) => !found.includes(r)).length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : Number(((2 * precision * recall) / (precision + recall)).toFixed(3));
  return { precision: Number(precision.toFixed(3)), recall: Number(recall.toFixed(3)), f1, found, expected };
}

export function evaluate(): { labeled: DetectionScore; clean: DetectionScore } {
  return {
    labeled: scoreDetection(LABELED_TF, LABELED_TF_EXPECTED),
    clean: scoreDetection(CLEAN_TF, []),
  };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  const r = evaluate();
  console.log('CloudPulse detection eval');
  console.log('  labeled:', r.labeled);
  console.log('  clean  :', r.clean);
}
