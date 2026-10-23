# 🎬 CloudPulse AI — Official Presenter Video Script & UI Action Guide

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon  
**Target Video Duration:** ~2 minutes 45 seconds (must be under 3 minutes)  
**Primary Track:** Alexa+ (Self-hosted MCP Server + Voice Copilot)  
**Mini-Challenges:** AWS Builder (Bedrock Nova Pro), Open Source  
**Live Application URL:** [http://localhost:3002/#copilot](http://localhost:3002/#copilot)

---

## 🖥️ Screen Recording Setup Checklist
1. **Open your browser:** Go to [`http://localhost:3002/#copilot`](http://localhost:3002/#copilot).
2. **Audio check:** Ensure the checkbox **"Read responses aloud"** (top-right of the Copilot box) is **CHECKED**.
3. **Screen layout:** Put this script on your second monitor or side window, and record your browser screen at 1080p.
4. **Editor/Terminal ready (for final 15s):** Have a terminal window ready showing the output of `npm test` (all 67 tests passing).

---

## ⏱️ Scene-by-Scene Visual & Script Walkthrough

### 🎬 Scene 1: Introduction, Problem & Project Overview (0:00 – 0:30)
* **What to show on UI:**
  * Start at the top of the page: [`http://localhost:3002/#copilot`](http://localhost:3002/#copilot).
  * Point cursor to the header badge: **`ALEXA+ CLOUD ARCHITECT`**.
  * Point cursor to the live green status pill: **`Connected to AWS Bedrock · amazon.nova-pro-v1:0`**.
  * Gently scroll down to show the Terraform code box displaying sample production infrastructure.
* **What to say aloud:**
> *"Hi everyone! This is **CloudPulse AI**—an autonomous cloud security and FinOps copilot built for the Amazon Developer Hackathon.*  
>  
> *CloudPulse connects **Alexa+** directly to your cloud infrastructure as an AI cloud architect, powered by a self-hosted **Model Context Protocol (MCP)** server and **Amazon Bedrock Nova Pro**.*  
>  
> *Today, AI security scanners can easily point out misconfigurations, but they have a fatal blind spot: **they don't understand the blast radius of their own fixes**.*  
>  
> *For example, turning on encryption for an RDS database looks like a simple one-line Terraform fix. But in AWS, that one line **destroys the database and creates a new one**!*  
>  
> *CloudPulse solves this. It's the Alexa+ cloud architect that **fixes what's safe, and asks before it breaks anything**."*

---

### 🎬 Scene 2: The Morning Voice Briefing (0:30 – 1:00)
* **What to show on UI:**
  * Scroll back to the Copilot section.
  * Click the quick-action button: **☀️ "Morning briefing"** (or click the microphone icon 🎙️).
  * Watch the blue speech bubble appear saying *"Thinking..."*, followed by the spoken audio response.
  * Scroll down slightly to show the **Action Items & Staged Remediations** cards (pointing out the `CRITICAL` Open SSH port and `HIGH` Unencrypted DB).
* **What to say aloud:**
> *"Every morning, I can ask Alexa+ for my morning cloud briefing.*  
>  
> *Alexa+ queries our local Model Context Protocol server, audits the live Terraform AST with Amazon Bedrock, and reports our posture in real time.*  
>  
> *It identifies one critical open SSH port exposed to `0.0.0.0/0`, an unencrypted production database, and over $420 a month in rightsizing savings.*  
>  
> *Notice what Alexa says: it already knows that **three fixes are safe to ship**, while **one fix requires my approval**."*

---

### 🎬 Scene 3: Blast-Radius & Safety Assessment (1:00 – 1:30)
* **What to show on UI:**
  * Click the quick-action button: **🛡️ "Is it safe to fix everything?"**.
  * Watch the **Change Plan** panel expand onto the screen.
  * Hover over the left column: **SAFE TO SHIP** (shows `SEC_OPEN_SSH_INGRESS`, `COST_OVERPROVISIONED_EC2`, `REL_NO_MULTI_AZ_DB`).
  * Hover over the right column: **NEEDS YOUR APPROVAL** (shows `SEC_UNENCRYPTED_DB` with red badge *"Needs approval"* and downtime explanation).
* **What to say aloud:**
> *"So I ask Alexa: 'Is it safe to fix everything?'*  
>  
> *Every single finding gets an automated blast-radius assessment from our Change Safety Engine.*  
>  
> *Closing SSH is safe and updates in place.*  
> *Resizing the EC2 instance stops and starts it, but stays in the same x86 CPU family so our current AMI still boots.*  
>  
> *However, encrypting the database will destroy and replace the instance! CloudPulse detects this replacement risk and strictly holds that change back until a human confirms."*

---

### 🎬 Scene 4: "Fix It" & Safe PR Staging (1:30 – 2:05)
* **What to show on UI:**
  * Click the quick-action button: **🚀 "Fix it"** (or type *"Alexa, fix it"* in the input bar and click Send).
  * Point cursor to the green badge that appears: **`✓ Re-scanned patched code: 3 → 0 issues`**.
  * Point to the status: **`PR staged (dry run) · cloudpulse/remediation-...`**.
  * Scroll down to the **Synthesized Unified Patch** view to show the clean, color-coded Git diff (green additions and red deletions).
* **What to say aloud:**
> *"I say: 'Alexa, fix it.'*  
>  
> *CloudPulse synthesizes a single, unified Git diff containing only the safe fixes.*  
> *It applies cleanly with `git apply`, and stages a pull request.*  
>  
> *Then it automatically re-scans the patched code: three issues down to zero.*  
> *The database replacement is held back, with the exact downtime warning clearly explained."*

---

### 🎬 Scene 5: Human Approval with Automated Safety Guards (2:05 – 2:35)
* **What to show on UI:**
  * In the Change Plan panel under "Needs your approval", click the red button:  
    **`Approve and include (snapshot guard added)`**  
    *(or type "Alexa, approve the database change")*.
  * Watch the Change Plan update with the blue badge: **`✓ Approved by you`**.
  * Scroll down to the Unified Patch and point out the added safety guard:  
    `skip_final_snapshot = false` and `final_snapshot_identifier = "app_db-pre-encryption"`.
  * Click and expand the **Pull request description** accordion to show the Bedrock-generated markdown summary and risk table.
* **What to say aloud:**
> *"Now I approve the change, with full understanding of what will happen.*  
>  
> *Look at what CloudPulse did: it automatically synthesized a safety guard—a final snapshot taken before the old database is deleted, preventing any data loss.*  
>  
> *The pull request description is generated by Amazon Bedrock Nova Pro, while the risk table is strictly enforced by deterministic code.*  
>  
> *Our core philosophy: **Rules decide, AI explains, humans approve**."*

---

### 🎬 Scene 6: MCP Server Protocol & Test Proof (2:35 – 2:50)
* **What to show on UI:**
  * Scroll to the top and click the second tab: **`Alexa+ MCP Server`** (notice the browser URL updates to `http://localhost:3002/#mcp`).
  * Click **`initialize`** and **`tools/list`** to show the 7 registered JSON-RPC tools with their JSON Schema (2020-12) validation.
  * Switch briefly to your open terminal window displaying `npm test` with all **67 assertions passing**.
* **What to say aloud:**
> *"CloudPulse implements the modern Model Context Protocol specification (2026-07-28) over standard JSON-RPC 2.0 with seven distinct tools.*  
>  
> *Everything is verified with **67 green automated test assertions** and a 1.000 F1 score on our evaluation fixtures.*  
>  
> *CloudPulse AI bridges conversational intelligence with cloud safety. Thank you!"*

---

## 📁 File Location
This exact guide is permanently saved in your repository at:  
👉 [`docs/DEMO_VIDEO_SCRIPT.md`](file:///g:/ReplitProjects/hackathons/amazon-developer-hackathon/docs/DEMO_VIDEO_SCRIPT.md)
