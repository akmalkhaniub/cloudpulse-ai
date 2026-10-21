# 🎬 CloudPulse AI — Official 3-Minute Demo Video Script
**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon (Deadline: Friday, October 23, 2026 @ 12:00 PM PDT)  
**Primary Track:** Alexa+ (self-hosted MCP `2026-07-28` server + simulated Alexa+ web experience) • **Mini-Challenges:** AWS Builder (`amazon.nova-pro-v1:0`), Open Source  
**Concept extensions (say "concept" / "simulated" on camera):** Bee-style standup sync, Fire TV-style wallboard  
**Rules reminder:** under 3 minutes, public on YouTube/Vimeo, English. For the simulated Alexa+ path, briefly show the simulation source (`src/alexa_mcp_server.ts`).  
**Live Local URL:** `http://localhost:3002`

---

## ⏱️ Time-Coded Walkthrough (3:00 Total)

| Timestamp | Segment | On-Screen Action (`http://localhost:3002`) | Voiceover Script |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:20** | **1. The Hook** | Show the CloudPulse header and the **Copilot** tab with the findings list. | *"Alexa+ already handles calendars and reminders. We asked: what if Alexa+ could act as a senior cloud architect for your engineering team? Meet CloudPulse AI, a self-hosted MCP server for Alexa+, backed by Amazon Bedrock Nova Pro."* |
| **0:20 – 1:05** | **2. Alexa+ Voice (Copilot tab)** | Click **☀️ Morning Briefing** (or use the 🎙️ mic). Let the spoken reply play. Then click **🚀 Synthesize & Create PR** and scroll to the colored unified patch. | *"I ask Alexa+ for my morning cloud briefing. Alexa+ calls our MCP server, which audits the Terraform and reports one critical open-SSH rule, an unencrypted database, and $462.53 a month in rightsizing savings. When I say 'fix all violations and ship a pull request', CloudPulse combines four fixes into one patch that applies cleanly with git apply, and stages the PR."* |
| **1:05 – 1:30** | **3. Bedrock Converse + simulation source** | Click a finding's **View Unified Patch**. Briefly show `src/alexa_mcp_server.ts` (MCP tools + `/api/alexa` router) and `src/bedrock_converse_agent.ts` in the editor. | *"The audit runs through a real Amazon Bedrock Converse tool-use loop on Nova Pro. Our Alexa+ front end is a simulated web experience, and this is its source: the same MCP tools Alexa+ would call."* |
| **1:30 – 2:00** | **4. MCP Inspector** | Click the **MCP** tab → run `tools/list`, then a `tools/call`. | *"Here is the MCP server itself: JSON-RPC 2.0, six tools, each with input and output schemas and annotations."* |
| **2:00 – 2:30** | **5. Concept extensions** | Click **Standup Sync** → **Sync**; then **Wallboard** and press ◀ ▶ / Enter. | *"Two concept extensions, both simulated in the browser: standup transcript sync, which checks each spoken risk against the actual Terraform, and a 10-foot wallboard for a team TV, navigable with a remote."* |
| **2:30 – 2:45** | **6. Shape feedback** | Click the **Feedback** tab. | *"We documented concrete product feedback for Alexa+ MCP and Bedrock Converse, plus feature requests for Bee and Fire TV."* |
| **2:45 – 2:58** | **7. Proof** | Terminal: `npm test` (43 assertions) and `npm run eval` (F1 = 1.000). | *"Everything is backed by 43 automated assertions, including patch-correctness tests, and a 1.000 F1 score on labeled, clean, and adversarial Terraform. Thank you!"* |
