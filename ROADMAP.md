# Roadmap & Implementation Milestones: CloudPulse AI
**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon  
**Target Submission Deadline:** October 23, 2026  

---

> **Status legend (updated 2026-09-18):** `[x]` implemented in code · `[~]` partial / stand-in (working JS prototype, not the production stack named) · `[ ]` not started.
> **Reality note:** Node.js prototype with an IaC parser, Well-Architected rule engine, a mock-backed Bedrock converse agent, and a remediation synthesizer (589 LOC, 7 passing tests). Dashboard is static HTML, not Next.js; no live Bedrock SDK calls or GitHub PR automation yet.

## Phase 1: Core Engine & IaC Parser (Days 1–5)
- [x] Initialize Node.js/TypeScript backend with fastify/express and Python AST helper. *(Node.js/Express, no Python helper)*
- [x] Implement Terraform HCL / JSON parser into normalized resource DAG representation.
- [x] Define AWS Well-Architected Framework compliance rule engine (Security, Cost, Reliability).
- [x] Write automated unit tests for rule engine verifying standard misconfigurations.

## Phase 2: Bedrock Reasoning & Patch Synthesizer (Days 6–10)
- [~] Integrate Amazon Bedrock SDK (Claude 3.5 Sonnet / AWS Titan). *(mock-backed converse agent, no live SDK)*
- [x] Design structured prompt templates for deterministic patch diff synthesis.
- [~] Add sanity-checking compiler step to verify generated diffs compile without syntax errors.
- [ ] Implement automated GitHub Action / Webhook endpoint to post remediation PRs.

## Phase 3: Interactive Dashboard & Topology Visualizer (Days 11–15)
- [~] Create Next.js 14 App Router frontend with Tailwind CSS and shadcn/ui. *(static HTML/Tailwind dashboard)*
- [ ] Integrate React Flow / Cytoscape for interactive infrastructure topology graph visualization.
- [~] Build real-time Cost Savings vs Vulnerability risk matrix.
- [~] Add one-click "Apply Patch" simulation with diff viewer.

## Phase 4: Verification, Demo Polish & Submission (Days 16–20)
- [ ] End-to-end integration test with sample real-world repositories (e.g. AWS microservices demo).
- [ ] Record 3-minute video demonstration highlighting architectural problem, scan speed, and patch generation.
- [ ] Prepare clean Devpost submission write-up with public GitHub repository and architecture diagrams.
