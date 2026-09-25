/**
 * AWS Well-Architected Framework Rule Engine
 * Evaluates cloud resources against Security, Cost Optimization, and Reliability pillars.
 */
import type { CloudResource } from './iac_parser.js';

export type Pillar = 'SECURITY' | 'COST_OPTIMIZATION' | 'RELIABILITY';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Rule {
  id: string;
  pillar: Pillar;
  severity: Severity;
  title: string;
  description: string;
  check: (resource: CloudResource, allResources: CloudResource[]) => boolean;
  monthlySavingsUSD: number;
}

export interface Finding {
  ruleId: string;
  pillar: Pillar;
  severity: Severity;
  title: string;
  description: string;
  resourceId: string;
  resourceType: string;
  monthlySavingsUSD: number;
}

export interface AuditReport {
  totalResourcesScanned: number;
  violationsCount: number;
  totalMonthlySavingsUSD: number;
  findings: Finding[];
}

/**
 * On-demand list prices, us-east-1, USD per hour.
 * Source: AWS public price list order of magnitude, recorded 2026-09-25.
 * This is a local table, not a live AWS Price List API call.
 */
export const ON_DEMAND_USD_PER_HOUR: Record<string, number> = {
  'm5.4xlarge': 0.768,
  'm5.8xlarge': 1.536,
  'c5.4xlarge': 0.68,
  'c5.8xlarge': 1.36,
  't4g.xlarge': 0.1344
};

const HOURS_PER_MONTH = 730;
export const RIGHTSIZE_TARGET = 't4g.xlarge';

/** Monthly list-price difference versus the rightsizing target. 0 when the type is unknown. */
export function rightsizingSavingsUSD(instanceType: string): number {
  const current = ON_DEMAND_USD_PER_HOUR[instanceType];
  const target = ON_DEMAND_USD_PER_HOUR[RIGHTSIZE_TARGET];
  if (current == null || target == null) return 0;
  return Math.round((current - target) * HOURS_PER_MONTH * 100) / 100;
}

export const RULES: Rule[] = [
  {
    id: 'SEC_PUBLIC_S3',
    pillar: 'SECURITY',
    severity: 'CRITICAL',
    title: 'Public S3 Bucket Detected',
    description: 'S3 bucket allows public read/write access or lacks explicit public access block.',
    check: (resource) => {
      if (resource.type === 'aws_s3_bucket') {
        const acl = resource.properties.acl;
        if (acl === 'public-read' || acl === 'public-read-write') return true;
        if (resource.rawBody && resource.rawBody.includes('0.0.0.0/0')) return true;
      }
      return false;
    },
    monthlySavingsUSD: 0
  },
  {
    id: 'SEC_OPEN_SSH_INGRESS',
    pillar: 'SECURITY',
    severity: 'CRITICAL',
    title: 'Unrestricted Ingress on Port 22 (SSH) or 3389 (RDP)',
    description: 'Security group allows 0.0.0.0/0 ingress on administrative ports, exposing instances to automated brute-force attacks.',
    check: (resource) => {
      if (resource.type === 'aws_security_group') {
        const raw = resource.rawBody || '';
        if (raw.includes('0.0.0.0/0') && (raw.includes('22') || raw.includes('3389'))) return true;
      }
      return false;
    },
    monthlySavingsUSD: 0
  },
  {
    id: 'SEC_UNENCRYPTED_DB',
    pillar: 'SECURITY',
    severity: 'HIGH',
    title: 'Unencrypted RDS Database Instance',
    description: 'RDS database instance lacks KMS at-rest storage encryption.',
    check: (resource) => resource.type === 'aws_db_instance' && resource.properties.storage_encrypted !== true,
    monthlySavingsUSD: 0
  },
  {
    id: 'COST_OVERPROVISIONED_EC2',
    pillar: 'COST_OPTIMIZATION',
    severity: 'MEDIUM',
    title: 'Oversized Development Instance Type',
    description: 'EC2 instance uses m5.4xlarge or c5.4xlarge in non-production environment; candidate for rightsizing to t4g.xlarge.',
    check: (resource) => {
      if (resource.type === 'aws_instance') {
        const type = resource.properties.instance_type;
        if (typeof type === 'string' && (type.includes('4xlarge') || type.includes('8xlarge'))) return true;
      }
      return false;
    },
    monthlySavingsUSD: 0
  },
  {
    id: 'COST_ORPHANED_EBS_VOLUME',
    pillar: 'COST_OPTIMIZATION',
    severity: 'LOW',
    title: 'Unattached High-IOPS EBS Volume',
    description: 'Unattached io2 / gp3 storage volume provisioned without instance attachment.',
    check: (resource, allResources) => {
      if (resource.type === 'aws_ebs_volume') {
        const isAttached = allResources.some(
          (r) => r.type === 'aws_volume_attachment' && (r.rawBody || '').includes(resource.name)
        );
        return !isAttached;
      }
      return false;
    },
    monthlySavingsUSD: 65.0
  },
  {
    id: 'SEC_IAM_WILDCARD',
    pillar: 'SECURITY',
    severity: 'CRITICAL',
    title: 'IAM Policy Grants Wildcard Action/Resource',
    description: 'IAM policy uses Action "*" or Resource "*", violating least-privilege.',
    check: (resource) => {
      if (resource.type === 'aws_iam_policy' || resource.type === 'aws_iam_role_policy') {
        const raw = resource.rawBody || '';
        return /"?Action"?\s*[:=]\s*"?\*"?/i.test(raw) || /"?Resource"?\s*[:=]\s*"?\*"?/i.test(raw) || raw.includes('"*"');
      }
      return false;
    },
    monthlySavingsUSD: 0
  },
  {
    id: 'SEC_UNENCRYPTED_EBS',
    pillar: 'SECURITY',
    severity: 'HIGH',
    title: 'Unencrypted EBS Volume',
    description: 'EBS volume lacks at-rest encryption (encrypted = true).',
    check: (resource) => resource.type === 'aws_ebs_volume' && resource.properties.encrypted !== true,
    monthlySavingsUSD: 0
  },
  {
    id: 'REL_NO_MULTI_AZ_DB',
    pillar: 'RELIABILITY',
    severity: 'MEDIUM',
    title: 'RDS Instance Without Multi-AZ',
    description: 'Production RDS database has no Multi-AZ standby, risking availability on AZ failure.',
    check: (resource) => resource.type === 'aws_db_instance' && resource.properties.multi_az !== true,
    monthlySavingsUSD: 0
  },
  {
    id: 'SEC_UNVERSIONED_S3',
    pillar: 'SECURITY',
    severity: 'LOW',
    title: 'S3 Bucket Without Versioning',
    description: 'S3 bucket has no versioning, weakening ransomware/accidental-delete recovery.',
    check: (resource) => {
      if (resource.type === 'aws_s3_bucket') {
        const raw = (resource.rawBody || '').toLowerCase();
        return !raw.includes('versioning');
      }
      return false;
    },
    monthlySavingsUSD: 0
  }
];

export class WellArchitectedEngine {
  /** Run all security and cost rules against parsed resources. */
  static audit(resources: CloudResource[]): AuditReport {
    const findings: Finding[] = [];
    let totalMonthlySavingsUSD = 0;

    for (const resource of resources) {
      for (const rule of RULES) {
        if (rule.check(resource, resources)) {
          findings.push({
            ruleId: rule.id,
            pillar: rule.pillar,
            severity: rule.severity,
            title: rule.title,
            description: rule.description,
            resourceId: resource.id,
            resourceType: resource.type,
            monthlySavingsUSD: rule.id === 'COST_OVERPROVISIONED_EC2'
              ? rightsizingSavingsUSD(String(resource.properties.instance_type || ''))
              : rule.monthlySavingsUSD
          });
          totalMonthlySavingsUSD += findings[findings.length - 1].monthlySavingsUSD;
        }
      }
    }

    return { totalResourcesScanned: resources.length, violationsCount: findings.length, totalMonthlySavingsUSD, findings };
  }
}
