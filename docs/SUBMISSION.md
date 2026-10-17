# 🏆 Devpost Submission — Build, Ship, Shape: Amazon Developer Hackathon

- **Project Title:** CloudPulse AI — Unified Amazon Ecosystem DevSecOps & FinOps Agent
- **Primary Track:** Alexa+ Track (Self-Hosted MCP Server & Conversational Agent Skill)
- **Ecosystem Integrations:** Amazon Bee Wearable (Standup Transcript-to-Terraform Sync) & Amazon Fire TV (10-Foot NOC War-Room Wallboard)
- **Mini-Challenge:** AWS Builder (Amazon Bedrock Converse API — `amazon.nova-pro-v1:0`)
- **Repository:** https://github.com/akmalkhaniub/cloudpulse-ai
- **Submission Deadline:** Friday, October 23, 2026 @ 12:00 PM PDT

---

## Inspiration

Alexa+ already handles everyday personal tasks like calendars, emails, and reminders out of the box. For the **Build, Ship, Shape: Amazon Developer Hackathon**, we asked a much bigger question: **What happens when you connect Alexa+, the Amazon Bee wearable, Amazon Fire TV, and Amazon Bedrock via a single self-hosted Model Context Protocol (MCP) server?**

Every morning, engineering teams discuss cloud risks in standup (*"Did we close port 22 on edge_ingress? Why are we paying for m5.4xlarge?"*), only for those action items to get lost in Slack. With **CloudPulse AI**:
1. Your **Amazon Bee wearable** passively captures the standup transcript, extracts every mentioned AWS resource risk, and cross-verifies it against your production Terraform AST.
2. Your office **Amazon Fire TV** displays a 10-foot NOC War-Room Wallboard where anyone can navigate findings with a D-Pad remote.
3. You simply say: *"Alexa, ask CloudPulse for my morning cloud briefing"* or *"Alexa, fix all violations and ship a GitHub Pull Request"*—and **Amazon Bedrock (`amazon.nova-pro-v1:0`)** synthesizes the exact zero-downtime Git diff and opens the PR.

---

## What it does

CloudPulse AI is a self-hosted **Alexa+ Model Context Protocol (MCP) Server** (`/api/mcp`) exposing **6 tools** backed by the **Amazon Bedrock Converse API** (`amazon.nova-pro-v1:0`):

* **☀️ Alexa+ Morning Cloud Briefing (`get_morning_cloud_briefing`):** Summarizes production Terraform security posture, critical risks (e.g., open SSH port 22, unencrypted RDS), and monthly/annual FinOps savings (`$462.53/mo` / `$5,550.36/yr` on the sample stack) via natural spoken synthesis and live browser microphone Speech-to-Text (`SpeechRecognition`).
* **🐝 Amazon Bee Wearable Standup Sync (`ingest_bee_meeting_transcript`):** Ingests diarized engineering standup transcripts from an Amazon Bee wearable, maps spoken concerns to AWS Well-Architected rules, cross-verifies them against the active Terraform AST, and stages remediation patches automatically.
* **📺 Amazon Fire TV 10-Foot NOC Wallboard (`get_firetv_wallboard_state`):** Renders a high-contrast 10-foot engineering war-room display with full D-Pad spatial focus navigation (`ArrowLeft`, `ArrowRight`, `Enter`) to inspect and remediate violations from across the room.
* **🔍 Multi-Pillar AWS Well-Architected Audit (`audit_iac_manifest`):** Uses Amazon Bedrock Converse API (`amazon.nova-pro-v1:0`) and a deterministic HCL AST parser to score manifests across Security, Reliability, and Cost Optimization with **1.000 Precision, 1.000 Recall, and 1.000 F1** on our labeled and adversarial benchmark fixtures.
* **🛠️ Zero-Downtime Git Patch Synthesis (`synthesize_remediation_diff`) & 🚀 Voice PR Shipping (`ship_github_remediation_pr`):** Generates unified Git diffs and stages/opens a GitHub Pull Request directly from an Alexa+ voice command.

---

## How we built it

* **Self-Hosted Alexa+ MCP Server (`src/alexa_mcp_server.ts`):** Implements JSON-RPC 2.0 `initialize`, `tools/list`, and `tools/call` at `/api/mcp` for all 6 tools, plus natural-language utterance routing at `/api/alexa`, Bee wearable ingestion at `/api/bee/ingest`, and Fire TV wallboard state at `/api/firetv/wallboard`.
* **Amazon Bedrock Converse API (`src/bedrock_converse_agent.ts`):** Built on `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`) using `amazon.nova-pro-v1:0` (~343ms live response latency in `us-east-1`), with an automatic offline simulator fallback so judges can test with zero AWS setup.
* **HCL AST Parser & Rule Engine (`src/iac_parser.ts`, `src/well_architected_engine.ts`):** Parses resource blocks, nested ingress rules, and cross-resource references without false positives on tricky-clean configs.
* **Automated Verification (`test/`):** 4 test suites covering HCL parsing, F1 benchmark evaluation (`src/eval.ts`), Bedrock Converse tool calling, and 16 HTTP + MCP JSON-RPC + Bee + Fire TV integration assertions.

---

## Challenges we ran into & "Shape" Developer Feedback

We documented detailed developer feedback and SDK proposals across all 4 Amazon products in `docs/AMAZON_DEVELOPER_FEEDBACK.md` and inside Tab 5 of our Web Studio:
1. **Alexa+ MCP ↔ Bedrock Converse Schema Bridge:** Proposed `@amazon-alexa/mcp-bedrock-bridge` to eliminate dual JSON Schema maintenance between MCP `inputSchema` and Bedrock `toolSpec.inputSchema.json`, plus an offline `alexa-mcp-doctor` CLI.
2. **Amazon Bedrock Converse Tool Result Serialization:** Proposed auto-coercing primitive/array `toolResult` payloads and adding a `listConverseReadyModels()` filter.
3. **Amazon Bee Wearable Action-Item Webhooks:** Proposed signed `bee.meeting.action_item.extracted` webhooks that forward structured domain entities directly to self-hosted Alexa+ MCP servers.
4. **Amazon Fire TV / Vega OS State Sync:** Proposed a first-class `useAlexaMcpState()` hook for binding MCP tool results directly to D-Pad focus grids on 10-foot displays.
