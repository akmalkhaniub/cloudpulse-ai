# 🎬 CloudPulse AI — Official 2-3 Minute Presenter Script
**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon (Devpost Deadline: Friday, October 23, 2026 @ 12:00 PM PDT)  
**Primary Track:** Alexa+ (Self-hosted MCP `2026-07-28` server)  
**Mini-Challenge Tracks:** AWS Builder (`amazon.nova-pro-v1:0` via Bedrock Converse), Open Source  
**Live UI:** [http://localhost:3002/#copilot](http://localhost:3002/#copilot) & [http://localhost:3002/#mcp](http://localhost:3002/#mcp)

---

## 📺 How to Use This Script
1. Open this file on your **second monitor / side screen**.
2. Open your browser on your main screen at **`http://localhost:3002/#copilot`**.
3. Hit screen record on your main screen and read each section smoothly as you click the corresponding button!

---

## ⏱️ Scene-by-Scene Presenter Script

### Scene 1: The Hook & Introduction (0:00 – 0:30)
> **URL:** `http://localhost:3002/#copilot`  
> **Action:** Show the header badge ("ALEXA+ CLOUD ARCHITECT"), the clean dashboard, and point to the live status indicator.

**Read aloud:**
> *"Alexa+ already manages calendars, reminders, and smart homes. But what if Alexa+ could act as a senior cloud architect for your engineering team?*  
>  
> *Meet **CloudPulse AI**: a self-hosted Model Context Protocol server that connects Alexa+ directly into your cloud infrastructure, powered by Amazon Bedrock Nova Pro and the Well-Architected Framework."*

---

### Scene 2: Alexa+ Voice Briefing (0:30 – 1:10)
> **URL:** `http://localhost:3002/#copilot`  
> **Action:** Click the button **☀️ "Alexa, give me my morning cloud briefing"** (or use the 🎙️ mic button). Watch the transcript and response appear, then scroll down to the Security Findings cards.

**Read aloud:**
> *"I ask Alexa+: 'Alexa, give me my morning cloud briefing.'*  
>  
> *Alexa+ immediately queries our local MCP server via Model Context Protocol. It audits our live Terraform infrastructure and reports our posture in real time: one critical open SSH port exposed to the world on port 22, an unencrypted production database, and over $462 a month in over-provisioned compute and orphaned storage."*

---

### Scene 3: Bedrock Converse Remediation & PR Shipping (1:10 – 1:50)
> **URL:** `http://localhost:3002/#copilot`  
> **Action:** Click the button **🚀 "Alexa, fix all violations and ship a pull request"** (or click the green **"View Unified Patch"** button). Scroll down to show the color-coded Unified Git Diff with green additions and red deletions.

**Read aloud:**
> *"Next, I ask Alexa+: 'Alexa, fix all violations and ship a pull request.'*  
>  
> *Under the hood, Amazon Bedrock Converse analyzes the Terraform Abstract Syntax Tree and synthesizes a zero-downtime, compliant remediation patch.*  
>  
> *Look at this unified git diff: it closes the open CIDR blocks, enables AES-256 storage encryption, and rightsizes compute without realignment noise. The patch applies cleanly with git apply, and automatically stages a GitHub pull request for the devops team."*

---

### Scene 4: Alexa+ MCP Server Deep-Dive (1:50 – 2:30)
> **URL:** `http://localhost:3002/#mcp` (Notice the URL automatically changes to `#mcp`!)  
> **Action:** Click the **Alexa+ MCP Server** tab. Click **"Run tools/list"** to show the 6 registered JSON-RPC tools. Then click **"Execute get_morning_cloud_briefing"** to demonstrate structuredContent output.

**Read aloud:**
> *"Now let's switch to the **Alexa+ MCP Server** tab—notice how deep URL routing preserves our state.*  
>  
> *CloudPulse implements the modern MCP specification (2026-07-28) over standard JSON-RPC 2.0. We expose six distinct cloud architecture tools: including `get_morning_cloud_briefing`, `audit_iac_manifest`, `generate_remediation_diff`, and `create_remediation_pr`.*  
>  
> *Each tool features rigorous JSON Schema input and output validation, read-only annotations, and high-priority human-in-the-loop approvals for any destructive changes."*

---

### Scene 5: Test Verification & Wrap-up (2:30 – 2:55)
> **Action:** Switch briefly to your terminal showing the test results, or point to the verification stats in the dashboard footer.

**Read aloud:**
> *"Every single component is tested and verified. Our automated test suite runs 43 green assertions covering IaC AST parsing, Bedrock Converse tool-calling loops, MCP JSON-RPC protocol compliance, and an eval suite achieving a 1.000 F1 score on labeled, clean, and adversarial Terraform manifests.*  
>  
> *CloudPulse AI bridges conversational intelligence with production cloud engineering. Thank you!"*
