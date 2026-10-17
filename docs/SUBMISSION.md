# 🏆 Devpost Submission — Build, Ship, Shape: Amazon Developer Hackathon

- **Project Title:** CloudPulse AI — Alexa+ MCP Skill & Amazon Bedrock FinOps Agent
- **Primary Track:** Alexa+ Track (Self-Hosted MCP Server & Conversational Agent Skill)
- **Mini-Challenge:** AWS Builder (Amazon Bedrock Converse API — `amazon.nova-pro-v1:0`)
- **Repository:** https://github.com/akmalkhaniub/cloudpulse-ai
- **Submission Deadline:** Friday, October 23, 2026 @ 12:00 PM PDT

---

## Inspiration

Alexa+ already handles everyday personal tasks like calendars, emails, and reminders out of the box. We asked a bigger question for the **Build, Ship, Shape: Amazon Developer Hackathon**: **What happens when you give Alexa+ a self-hosted Model Context Protocol (MCP) server connected to your production AWS infrastructure and Amazon Bedrock?**

Platform engineers and CTOs spend hours sifting through passive security alerts, FinOps dashboards, and Terraform files before every release. Instead of opening five consoles, an engineering leader should be able to say: *"Alexa, ask CloudPulse for my morning cloud briefing"*—hear their exact security exposure and monthly EC2/EBS waste—and say *"Alexa, fix all violations and ship a GitHub Pull Request."*

---

## What it does

CloudPulse AI is a self-hosted **Alexa+ Model Context Protocol (MCP) Server** (`/api/mcp`) and **Amazon Bedrock Converse API** (`amazon.nova-pro-v1:0`) DevSecOps copilot:

* **Alexa+ Morning Cloud Briefing (`get_morning_cloud_briefing`):** Summarizes production Terraform security posture, critical risks (e.g., open SSH port 22, unencrypted RDS), and monthly/annual FinOps savings via natural spoken synthesis.
* **Multi-Pillar AWS Well-Architected Audit (`audit_iac_manifest`):** Uses Amazon Bedrock Converse API (`amazon.nova-pro-v1:0`) and a deterministic HCL AST parser to score manifests across Security, Reliability, and Cost Optimization with **1.000 Precision, 1.000 Recall, and 1.000 F1** on our labeled and adversarial benchmark fixtures.
* **Zero-Downtime Git Patch Synthesis (`synthesize_remediation_diff`):** Generates unified Git diffs that close open ingress ports, enable KMS encryption, and rightsize overprovisioned EC2 instances (`$276.48/mo` / `$3,317.76/yr` on the sample stack).
* **Voice-Triggered Pull Request Shipping (`ship_github_remediation_pr`):** Stages or opens a GitHub Pull Request containing the verified patches directly from an Alexa+ voice command.
* **3-Tab Web Simulator & MCP Inspector (`http://localhost:3002`):** Includes a live Alexa+ Voice Simulator (with Web Speech TTS), a raw **MCP JSON-RPC 2.0 Inspector**, and a **"Shape" Amazon Developer Feedback** tab.

---

## How we built it

* **Self-Hosted Alexa+ MCP Server (`src/alexa_mcp_server.ts`):** Implements JSON-RPC 2.0 `initialize`, `tools/list`, and `tools/call` at `/api/mcp` plus natural-language utterance routing at `/api/alexa`.
* **Amazon Bedrock Converse API (`src/bedrock_converse_agent.ts`):** Built on `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`) using `amazon.nova-pro-v1:0` (~343ms live response latency in `us-east-1`), with an automatic offline simulator fallback so judges can test with zero AWS setup.
* **HCL AST Parser & Rule Engine (`src/iac_parser.ts`, `src/well_architected_engine.ts`):** Parses resource blocks, nested ingress rules, and cross-resource references (such as `aws_s3_bucket_versioning`) without false positives on tricky-clean configs.
* **Automated Verification (`test/`):** 4 test suites covering HCL parsing, F1 benchmark evaluation (`src/eval.ts`), Bedrock Converse tool calling, and 13 HTTP + MCP JSON-RPC integration assertions.

---

## Challenges we ran into

1. **Bridging MCP JSON Schema and Bedrock Converse `toolConfig`:** MCP tools expose standard JSON Schema in `inputSchema`, while Bedrock `ConverseCommand` nests schemas inside `toolSpec.inputSchema.json`. We documented this in our **"Shape" Product Feedback** (`docs/AMAZON_DEVELOPER_FEEDBACK.md`) and proposed an `@amazon-alexa/mcp-bedrock-bridge` utility.
2. **Preventing False Positives on Tricky Terraform Configs:** Naive regex scanners flag `0.0.0.0/0` on port 443 when `"22"` appears in a tag name, or flag an S3 bucket as unversioned when versioning is defined in a separate `aws_s3_bucket_versioning` resource. Our AST parser resolves cross-resource references and achieves `F1 = 1.000` across labeled, clean, and tricky-clean fixtures.
3. **Testing Gated Alexa+ Skills Locally:** Because the Alexa+ console is gated to preview partners, we built a browser-based Alexa+ Voice & JSON-RPC 2.0 Simulator with Web Speech API voice output so judges can experience the full conversational loop in one click.

---

## Accomplishments that we're proud of

* **Dual Track Qualification (Alexa+ Track + AWS Builder):** Combines a compliant JSON-RPC 2.0 MCP server for Alexa+ with live `amazon.nova-pro-v1:0` Bedrock Converse tool execution.
* **Measured 1.000 F1 Detection Benchmark:** Zero false alarms on compliant and adversarial Terraform manifests (`npm run eval`).
* **Complete "Shape" Engineering Feedback:** Delivered actionable SDK and tooling recommendations in `docs/AMAZON_DEVELOPER_FEEDBACK.md` and directly inside the web UI.

---

## What we learned

* **Alexa+ + MCP Unlocks High-Stakes Enterprise Workflows:** Moving Alexa+ beyond basic consumer tasks into deterministic code and cloud governance turns voice into an executive command center.
* **Deterministic Verification Complements Foundation Models:** Pairing Amazon Nova Pro with a deterministic HCL parser guarantees that every synthesized diff is syntactically valid and grounded in real resource attributes.

---

## What's next for CloudPulse AI

* **Alexa+ Progressive SSML Streaming:** Stream real-time progress updates while multi-module Terraform plans run.
* **Native AWS CDK & CloudFormation Support:** Expand the AST parser to synthesize TypeScript CDK and CloudFormation patches alongside Terraform HCL.
* **Open-Source `@amazon-alexa/mcp-bedrock-bridge` Package:** Publish our MCP-to-Bedrock Converse schema adapter for the broader Amazon developer community.
