/**
 * Change Safety Engine — the "blast radius" of each remediation.
 *
 * Scanners stop at "this is wrong". CloudPulse also answers "what happens if I apply the fix?":
 * how AWS applies the change (in place, reboot, or replacement), whether data or uptime is at risk,
 * which guards CloudPulse added to the patch, and what a human must confirm first.
 *
 * The rules below encode documented AWS / Terraform provider behavior for each attribute change.
 * They are deterministic on purpose: a model may explain them, but never decides them.
 */

export type RiskLevel = 'SAFE' | 'CAUTION' | 'DISRUPTIVE';
export type ApplyBehavior = 'in-place' | 'in-place-with-restart' | 'replacement' | 'manual';

export interface ChangeRisk {
  ruleId: string;
  level: RiskLevel;
  applyBehavior: ApplyBehavior;
  /** One plain-English line on what AWS does when this is applied. */
  whatHappens: string;
  downtime: string;
  dataRisk: 'none' | 'low' | 'high';
  /** Guards CloudPulse added to the patch itself to make it safer. */
  guardsAdded: string[];
  /** Things a human must confirm or do before merging. */
  beforeYouMerge: string[];
  requiresApproval: boolean;
}

const PROFILES: Record<string, Omit<ChangeRisk, 'ruleId' | 'requiresApproval'>> = {
  SEC_OPEN_SSH_INGRESS: {
    level: 'SAFE',
    applyBehavior: 'in-place',
    whatHappens: 'The security group rule is updated in place; no instance restarts.',
    downtime: 'None, but SSH/RDP from outside the allowed CIDR stops working immediately.',
    dataRisk: 'none',
    guardsAdded: [],
    beforeYouMerge: ['Confirm the allowed CIDR matches your VPN or bastion range.']
  },
  REL_NO_MULTI_AZ_DB: {
    level: 'CAUTION',
    applyBehavior: 'in-place',
    whatHappens: 'RDS creates a synchronous standby in a second AZ from a snapshot of the primary.',
    downtime: 'No outage, but elevated write latency while the standby is created.',
    dataRisk: 'none',
    guardsAdded: ['apply_immediately = false (change waits for the maintenance window)'],
    beforeYouMerge: ['Expect roughly double the instance cost for the standby.']
  },
  COST_OVERPROVISIONED_EC2: {
    level: 'CAUTION',
    applyBehavior: 'in-place-with-restart',
    whatHappens: 'The instance is stopped, resized, and started again. Same CPU architecture, so the existing AMI still boots.',
    downtime: 'A few minutes of downtime for this instance during stop/start.',
    dataRisk: 'low',
    guardsAdded: ['Stays in the same x86 family so the current AMI keeps working (no Graviton/arm64 switch).'],
    beforeYouMerge: [
      'Sized from instance type only. Confirm with CloudWatch / Compute Optimizer that peak CPU and memory fit the smaller size.',
      'Instance-store volumes, if any, are wiped on stop.'
    ]
  },
  SEC_UNENCRYPTED_DB: {
    level: 'DISRUPTIVE',
    applyBehavior: 'replacement',
    whatHappens: 'Encryption cannot be enabled on an existing RDS instance, so Terraform destroys and recreates the database.',
    downtime: 'Full database outage until the new instance is restored and available.',
    dataRisk: 'high',
    guardsAdded: [
      'skip_final_snapshot = false',
      'final_snapshot_identifier = "<db>-pre-encryption" (a snapshot is taken before the old database is deleted)'
    ],
    beforeYouMerge: [
      'Schedule a maintenance window.',
      'Restore data into the new encrypted instance from the final snapshot (copy the snapshot with encryption, then restore).',
      'Update any connection strings if the endpoint changes.'
    ]
  },
  SEC_UNENCRYPTED_EBS: {
    level: 'DISRUPTIVE',
    applyBehavior: 'replacement',
    whatHappens: 'Encryption cannot be enabled on an existing EBS volume, so Terraform replaces it with a new, empty volume.',
    downtime: 'Volume is detached and replaced.',
    dataRisk: 'high',
    guardsAdded: [],
    beforeYouMerge: ['Snapshot the volume first, then create the encrypted volume from an encrypted copy of that snapshot.']
  }
};

const UNKNOWN: Omit<ChangeRisk, 'ruleId' | 'requiresApproval'> = {
  level: 'DISRUPTIVE',
  applyBehavior: 'manual',
  whatHappens: 'No safe automatic fix. Flagged for manual review.',
  downtime: 'Unknown',
  dataRisk: 'high',
  guardsAdded: [],
  beforeYouMerge: ['Review and fix manually.']
};

export function assessChangeRisk(ruleId: string): ChangeRisk {
  const p = PROFILES[ruleId] ?? UNKNOWN;
  return { ruleId, ...p, requiresApproval: p.level === 'DISRUPTIVE' };
}

export interface ChangePlan {
  safeToShip: ChangeRisk[];
  needsApproval: ChangeRisk[];
  overallRisk: RiskLevel;
}

/** Split auto-fixable rules into what can ship now and what needs a human "yes". */
export function buildChangePlan(ruleIds: string[]): ChangePlan {
  const risks = [...new Set(ruleIds)].map(assessChangeRisk);
  const needsApproval = risks.filter((r) => r.requiresApproval);
  const safeToShip = risks.filter((r) => !r.requiresApproval);
  const overallRisk: RiskLevel = needsApproval.length
    ? 'DISRUPTIVE'
    : safeToShip.some((r) => r.level === 'CAUTION') ? 'CAUTION' : 'SAFE';
  return { safeToShip, needsApproval, overallRisk };
}
