# 🏆 Devpost Submission — Build, Ship, Shape: Amazon Developer Hackathon

- **Project Title:** CloudPulse AI — Voice-First DevSecOps & FinOps Agent for Alexa+
- **Hackathon:** [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/)
- **Primary Track:** Alexa+ — self-hosted MCP server plus a simulated Alexa+ voice experience in a web app (simulation source: `src/alexa_mcp_server.ts`, `src/public/index.html`)
- **Mini-Challenges:** AWS Builder (Amazon Bedrock Converse API, `amazon.nova-pro-v1:0`) • Open Source (MIT-licensed, new public repo)
- **Concept extensions (simulated, not entered in those tracks):** Bee-style standup transcript sync and a Fire TV-style 10-foot wallboard, both running in the browser
- **Repository:** https://github.com/akmalkhaniub/cloudpulse-ai (MIT)
- **Built during the submission window:** first commit September 16, 2026
- **Submission Deadline:** Friday, October 23, 2026 @ 12:00 PM PDT

---

## Inspiration

Alexa+ already handles calendars, email, and reminders. We asked a bigger question: **what if Alexa+ could act as a senior cloud architect for an engineering team, through a single self-hosted Model Context Protocol (MCP) server backed by Amazon Bedrock?**

Every morning, teams talk about cloud risks in standup (*"Did we close port 22 on the web security group? Why are we paying for an m5.4xlarge?"*) and those action items get lost in chat. With CloudPulse AI you say *"Alexa, give me my morning cloud briefing"* or *"Alexa, fix all violations and ship a pull request"*, and the agent audits your Terraform, writes one verified patch, and stages the PR.

---

## What it does

CloudPulse AI is a self-hosted **Alexa+ MCP server** (`POST /api/mcp`, JSON-RPC 2.0) exposing **6 tools**, with an Alexa+ voice simulator (`POST /api/alexa`) that uses browser Speech-to-Text and Text-to-Speech:

* **☀️ Morning Cloud Briefing (`get_morning_cloud_briefing`):** a spoken summary of security posture and FinOps savings ($462.53/mo, $5,550.36/yr on the sample stack, from a local us-east-1 price table).
* **🔍 Well-Architected Audit (`audit_iac_manifest`):** an Amazon Bedrock Converse tool-use loop (`amazon.nova-pro-v1:0`) over a deterministic HCL rule engine covering Security, Reliability, and Cost Optimization.
* **🛠️ Patch Synthesis (`synthesize_remediation_diff`):** fixes scoped to the offending resource block, combined into **one unified diff that applies cleanly with `git apply`**. Re-auditing the patched sample manifest returns zero findings.
* **🚀 Voice PR Shipping (`ship_github_remediation_pr`):** stages the combined patch as a GitHub pull request (dry run without `GITHUB_TOKEN`).
* **🐝 Standup Transcript Sync (`ingest_bee_meeting_transcript`, concept):** maps spoken concerns in a sample diarized standup transcript to Well-Architected rules and checks whether each one really exists in the Terraform. It does not connect to a live Bee device.
* **📺 10-Foot Wallboard (`get_firetv_wallboard_state`, concept):** a browser-based war-room display with D-Pad-style arrow-key navigation. It is not a Fire OS / Vega OS app.

---

## How we built it

* **Alexa+ MCP Server (`src/alexa_mcp_server.ts`):** JSON-RPC 2.0 `initialize`, `tools/list`, and `tools/call` for all 6 tools, with `outputSchema` and annotations, plus natural-language utterance routing at `/api/alexa`.
* **Amazon Bedrock Converse (`src/bedrock_converse_agent.ts`):** `@aws-sdk/client-bedrock-runtime` `ConverseCommand` with `amazon.nova-pro-v1:0` and a real multi-turn `toolUse` / `toolResult` loop. A full live audit takes about 6–9 s end to end in our tests (us-east-1, called from Pakistan). Without AWS credentials it falls back to a deterministic simulator that follows the Converse schema, so judges can run everything offline.
* **HCL Parser, Rule Engine & Remediation (`src/iac_parser.ts`, `src/well_architected_engine.ts`, `src/remediation_synthesizer.ts`):** block-scoped attribute edits and an LCS-based unified diff with proper hunks.
* **Automated Verification (`test/`):** 43 assertions across 5 suites: 8 core/Bedrock, 4 parser, 6 F1 eval, 7 remediation-correctness, and 18 HTTP + MCP integration. Detection scores **1.000 precision / recall / F1** on labeled, clean, and adversarial-clean Terraform fixtures (`npm run eval`).

---

## Challenges we ran into

* Our first patch generator inserted `storage_encrypted = true` without removing the existing `false` (invalid Terraform), and it emitted one diff per finding against the same file. We rewrote it to edit attributes in place inside the right resource block and to emit one combined, `git apply`-able patch, with regression tests.
* Multi-turn Converse tool loops take several seconds, which is long for a voice turn. See the feedback below.

---

## Product Feedback ("Shape")

Full feedback is in `docs/AMAZON_DEVELOPER_FEEDBACK.md` and in the Feedback tab of the web app:
1. **Alexa+ MCP ↔ Bedrock Converse schema bridge:** MCP `inputSchema` and Converse `toolSpec.inputSchema.json` have to be maintained twice. We propose a shared adapter.
2. **Converse `toolResult` serialization:** primitive or array results get rejected. We propose auto-wrapping them in the SDK.
3. **Voice latency:** progressive or streaming responses for multi-step agent turns that take 6–9 s.
4. **Feature requests (concept extensions):** structured action-item webhooks from Bee, and an MCP-state hook for Fire TV / Vega OS 10-foot UIs.

---

## What's next

* Connect the MCP server to a real Alexa+ Agent Skill endpoint.
* Push the remediation branch and its commit before opening the PR (today live mode opens a PR from an existing branch).
* Replace the sample transcript with live Bee data, and port the wallboard to Vega OS.
