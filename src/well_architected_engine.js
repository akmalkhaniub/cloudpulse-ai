/**
 * AWS Well-Architected Framework Rule Engine
 * Evaluates cloud resources against Security, Cost Optimization, and Reliability pillars.
 */

export const RULES = [
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
        if (raw.includes('0.0.0.0/0') && (raw.includes('22') || raw.includes('3389'))) {
          return true;
        }
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
    check: (resource) => {
      if (resource.type === 'aws_db_instance') {
        return resource.properties.storage_encrypted !== true;
      }
      return false;
    },
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
        if (typeof type === 'string' && (type.includes('4xlarge') || type.includes('8xlarge'))) {
          return true;
        }
      }
      return false;
    },
    monthlySavingsUSD: 340.00
  },
  {
    id: 'COST_ORPHANED_EBS_VOLUME',
    pillar: 'COST_OPTIMIZATION',
    severity: 'LOW',
    title: 'Unattached High-IOPS EBS Volume',
    description: 'Unattached io2 / gp3 storage volume provisioned without instance attachment.',
    check: (resource, allResources) => {
      if (resource.type === 'aws_ebs_volume') {
        // Check if referenced in any aws_volume_attachment
        const isAttached = allResources.some(r => 
          r.type === 'aws_volume_attachment' && (r.rawBody || '').includes(resource.name)
        );
        return !isAttached;
      }
      return false;
    },
    monthlySavingsUSD: 65.00
  }
];

export class WellArchitectedEngine {
  /**
   * Run all security and cost rules against parsed resources
   * @param {Array<Object>} resources 
   * @returns {Object} audit report with findings and cost projections
   */
  static audit(resources) {
    const findings = [];
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
            monthlySavingsUSD: rule.monthlySavingsUSD
          });
          totalMonthlySavingsUSD += rule.monthlySavingsUSD;
        }
      }
    }

    return {
      totalResourcesScanned: resources.length,
      violationsCount: findings.length,
      totalMonthlySavingsUSD,
      findings
    };
  }
}
