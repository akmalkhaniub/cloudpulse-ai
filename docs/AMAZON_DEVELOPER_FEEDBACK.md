# 🛠️ Shape: Structured Developer Feedback for Amazon Engineering Teams

> **Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon (Deadline: October 23, 2026)  
> **Project:** CloudPulse AI — Unified Amazon Ecosystem Agent (Alexa+ MCP + Amazon Bee Wearable + Fire TV + AWS Bedrock)  
> **Tracks Targeted:** Primary: **Alexa+ Track (Self-Hosted MCP Server & Agent Skill)** | Ecosystem: **Amazon Bee Wearable & Fire TV** | Mini-Challenge: **AWS Builder (`amazon.nova-pro-v1:0`)**

This document fulfills the **"Shape"** pillar of the Amazon Developer Hackathon by providing concrete, engineering-level product feedback, friction points, and architectural recommendations discovered while building **CloudPulse AI** across all four Amazon developer surfaces.

---

## 1. Alexa+ Track: Self-Hosted Model Context Protocol (MCP) Server Integration

### 🔍 What We Built
We implemented a JSON-RPC 2.0 Model Context Protocol server (`src/alexa_mcp_server.ts` exposed at `/api/mcp`) with 6 tools (`get_morning_cloud_briefing`, `audit_iac_manifest`, `synthesize_remediation_diff`, `ship_github_remediation_pr`, `ingest_bee_meeting_transcript`, `get_firetv_wallboard_state`) and a web-based Alexa+ Voice Simulator (`/api/alexa`) with browser microphone Speech-to-Text (`SpeechRecognition`) and Text-to-Speech (`speechSynthesis`).

### ⚠️ Developer Friction Encountered
1. **Schema Translation Between MCP and Bedrock Converse:**
   - MCP tools define `inputSchema` directly as a JSON Schema object (`{ type: "object", properties: ... }`), whereas `@aws-sdk/client-bedrock-runtime` `ConverseCommand` wraps the schema inside `toolSpec.inputSchema.json`. Developers building an Alexa+ MCP server backed by Amazon Bedrock must maintain dual tool descriptors or write custom adapter code.
2. **Voice Latency vs. Multi-Step Agent Execution:**
   - When an Alexa+ utterance triggers a deep multi-turn tool loop (e.g., parsing HCL + calling Bedrock Converse + generating a unified diff), total execution can take 800ms–1,500ms. Standard voice skill timeouts and lack of progressive streaming SSML responses can make conversational agent turns feel abrupt if not buffered.
3. **Testing Gated Alexa+ Agent Skills Locally:**
   - Because the Alexa+ Developer Console simulator is currently gated to preview partners, independent builders have no official CLI tool to validate how Alexa+ ranks and selects among multiple MCP tools based on natural-language utterances.

### 💡 Actionable Recommendations for the Alexa+ Engineering Team
* **Ship `@amazon-alexa/mcp-bedrock-bridge`:** Provide a lightweight open-source TypeScript/Python adapter that converts any standard MCP `tools/list` response directly into a Bedrock `ConverseCommand` `toolConfig` and generates Alexa+ intent/slot samples automatically.
* **Progressive Voice Ack Hook (`mcp/progress`):** Support an intermediate spoken acknowledgment token in the Alexa+ MCP spec (e.g., *"Scanning your 3 Terraform resources now..."*) while the long-running MCP `tools/call` resolves.
* **Release an Offline `alexa-mcp-doctor` CLI:** A local conformance runner that fires test utterances and JSON-RPC 2.0 `initialize` / `tools/list` / `tools/call` probes against `http://localhost:<port>/api/mcp` and validates schema compliance before cloud deployment.

---

## 2. AWS Builder Track: Amazon Bedrock Converse API (`@aws-sdk/client-bedrock-runtime`)

### 🔍 What We Built
We integrated `@aws-sdk/client-bedrock-runtime` (`ConverseCommand`) with `amazon.nova-pro-v1:0` (achieving ~343ms baseline turn latency in `us-east-1`) alongside a multi-turn `tool_use` / `toolResult` loop (`src/bedrock_converse_agent.ts`).

### ⚠️ Developer Friction Encountered
1. **Cross-Region Inference Profile ID vs. Direct Model ID Confusion:**
   - Invoking `us.anthropic.claude-3-5-sonnet-20241022-v2:0` vs. `amazon.nova-pro-v1:0` produces different entitlement errors depending on whether an account has legacy Marketplace subscriptions vs. native first-party Nova access.
2. **Strict Content Block Array Wrapping in `toolResult`:**
   - When returning structured JSON from a tool execution back into `ConverseCommand`, wrapping `{ toolResult: { toolUseId, content: [{ json: result }] } }` works cleanly, but if `result` is a top-level primitive or array rather than a plain object, certain foundation models reject the payload with a generic validation exception.

### 💡 Actionable Recommendations for the Amazon Bedrock Team
* **Add `listConverseReadyModels()` Helper:** Add a convenience method or CLI flag (`aws bedrock list-foundation-models --converse-tool-use-ready`) that filters specifically for models currently callable by the caller's IAM principal with `toolConfig` enabled.
* **Auto-Coerce Non-Object `toolResult.content[].json`:** Automatically wrap array or primitive tool outputs into `{ value: ... }` in the SDK serializer so multi-model switching across Nova Pro and Claude 3.5 Sonnet never fails on tool return types.

---

## 3. Amazon Bee Wearable Track: Ambient Meeting Ingestion & Webhook Context

### 🔍 What We Built
We built `ingest_bee_meeting_transcript` (`POST /api/bee/ingest`), which ingests multi-speaker engineering standup transcripts captured by an Amazon Bee wearable, extracts spoken cloud security and FinOps action items, cross-verifies whether each spoken concern is actually present in the production Terraform AST, and stages unified remediation diffs.

### ⚠️ Developer Friction Encountered
1. **Unstructured Utterance Boundaries in Developer Workflows:**
   - Wearable transcripts stream raw diarized utterances (`Speaker A`, `Speaker B`), but developer tools require structured entity extraction (e.g., AWS resource names like `aws_db_instance.core_postgres`, port numbers like `22`, or instance classes like `m5.4xlarge`) before triggering downstream MCP tools.

### 💡 Actionable Recommendations for the Amazon Bee Team
* **Signed `bee.meeting.action_item.extracted` Webhooks with MCP Forwarding:** Allow Bee Developer Kit apps to register custom domain entity extractors (such as AWS resource IDs or GitHub repo names) and forward structured JSON-RPC `tools/call` payloads directly to an engineer's self-hosted Alexa+ MCP server at the end of a standup.

---

## 4. Amazon Fire TV Track: 10-Foot NOC Wallboard & D-Pad Focus Management

### 🔍 What We Built
We built `get_firetv_wallboard_state` (`POST /api/firetv/wallboard`) and a 10-foot NOC Engineering War-Room Wallboard UI with hardware D-Pad spatial focus navigation (`ArrowLeft`, `ArrowRight`, `Enter`) so engineering teams can inspect violations and trigger Alexa+ remediation directly on an office Fire TV screen.

### ⚠️ Developer Friction Encountered
1. **Cross-Device Session Handoff Between Alexa+ Voice and Fire TV UI:**
   - When an engineer asks *"Alexa, show the CloudPulse war-room on Fire TV"*, synchronizing the active MCP tool state (`audit_iac_manifest` + `get_firetv_wallboard_state`) with the 10-foot UI focus ring requires custom polling or WebSocket glue.

### 💡 Actionable Recommendations for the Fire TV / Vega OS Team
* **First-Class `useAlexaMcpState()` Hook in Vega OS / React Native for Fire TV:** Provide a built-in state-sync primitive that binds an Alexa+ MCP tool response directly to a D-Pad spatial navigation grid on Fire TV without requiring external WebSocket state brokers.
