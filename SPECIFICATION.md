# Technical Specification: CloudPulse AI
**Project Name:** CloudPulse AI (Amazon Developer Hackathon)  
**Status:** Prototype implemented — spec is target design (updated 2026-09-18)  

> **Implementation status (2026-09-18):** The sections below describe the *target* architecture. Currently built: a Node.js/Express prototype with the IaC parser, Well-Architected rule engine, a **mock-backed** Bedrock converse agent, and a remediation synthesizer (589 LOC, 7 passing tests). Not yet built: live Bedrock SDK calls, the GitHub remediation-PR bot, and the Next.js/React-Flow topology dashboard (currently a static HTML page).
**Version:** 1.0.0  

---

## 1. System Overview
CloudPulse AI is an autonomous cloud developer assistant and architecture sentinel that scans cloud infrastructure definitions (Terraform / AWS CDK), maps real-time resource utilization, detects drift and cost inefficiencies, and triggers intelligent remediation plans using Amazon Bedrock / Claude 3.5 Sonnet.

```mermaid
graph TD
    A[Developer Git Push / CLI] -->|Webhook / API| B[CloudPulse Ingestion API]
    B --> C[AST & Graph Parser (IaC / CDK)]
    C --> D[Security & Cost Rule Engine]
    C --> E[Bedrock LLM Agent Reasoner]
    D --> F[Issue Aggregator & Drift Detector]
    E --> F
    F --> G[Next.js Dashboard & Topology Graph]
    F --> H[GitHub Bot: Automated Remediation PR]
```

---

## 2. Functional Requirements

### 2.1 IaC Ingestion & Dependency Graph Parsing
- Ingest Terraform HCL and AWS Cloud Development Kit (CDK) manifests.
- Construct a directed acyclic graph (DAG) of all cloud resources, dependencies, and network boundary policies.

### 2.2 Intelligent Cost & Security Heuristics
- Evaluate infrastructure against the AWS Well-Architected Framework (Cost Optimization, Security, Reliability).
- Identify unattached volumes, over-provisioned ECS/EKS clusters, unencrypted S3 buckets, and open security groups (0.0.0.0/0).

### 2.3 Automated Remediation via Bedrock Agent
- Contextualize rule violations with surrounding code context.
- Formulate precise Git patches/diffs fixing the violation without breaking dependent resources.
- Output deterministic HCL/CDK code snippets with KaTeX cost projection formulas.

---

## 3. Data Models & API Specifications

### 3.1 IaC Scan Payload (`POST /api/v1/scan`)
```typescript
interface ScanRequest {
  repositoryUrl: string;
  commitHash: string;
  iacType: 'terraform' | 'cdk' | 'cloudformation';
  manifestFiles: Array<{
    path: string;
    content: string;
  }>;
}

interface ScanResponse {
  scanId: string;
  status: 'completed' | 'failed' | 'processing';
  summary: {
    totalResources: number;
    estimatedMonthlyCostUSD: number;
    vulnerabilitiesCount: number;
    driftCount: number;
  };
  recommendations: Array<{
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    resourceId: string;
    category: 'COST' | 'SECURITY' | 'PERFORMANCE';
    description: string;
    suggestedPatchDiff: string;
    monthlySavingsUSD: number;
  }>;
}
```

---

## 4. Non-Functional Requirements
- **Latency:** AST parsing and heuristic analysis must complete in `< 5000ms` for manifests under 5,000 lines.
- **Security:** Zero credential persistence; IAM roles must use Least Privilege principle with STS temporary tokens.
- **Reliability:** Microservices must fail gracefully with detailed schema validation errors.

---

## 5. Acceptance Criteria
1. Successfully parse a multi-resource Terraform manifest and display interactive topology DAG in Web UI.
2. Flag simulated critical security rules (e.g. public S3, 0.0.0.0/0 SSH) and generate instant code patches.
3. Show estimated monthly cloud cost reduction before and after proposed patch execution.
