# 🎬 CloudPulse AI — Official Demo Video Script (3 Minutes)
**Event:** [Amazon Developer Hackathon: Building the Future of Cloud & AI](https://amazonappdev2026.devpost.com/)  
**Target Time:** 2:45 – 3:15 Minutes  
**Tone:** Confident, enterprise-grade, developer-friendly, and technically precise  
**Visual Asset:** 16:9 Presentation Slides (`docs/pitch_deck.html`) + Live Web Console (`http://localhost:3002`)

---

## ⏱️ Video Breakdown

| Timestamp | Segment | Visual On-Screen | Speaker Audio / Voiceover |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:25** | **The Hook & Problem** | Slide 1 & Slide 2 (The \$60B Cloud Waste Dilemma) | *"Over 40% of AWS environments deploy with severe security misconfigurations—like unrestricted SSH ingress and unencrypted storage. At the same time, companies waste billions on idle, over-provisioned development instances. But the real bottleneck? Alert fatigue. Cloud engineers receive hundreds of static warnings, but manually writing, reviewing, and testing Terraform patches takes days. We built CloudPulse AI to solve this."* |
| **0:25 - 0:55** | **The Solution & Bedrock Architecture** | Slide 3 & Slide 4 (Bedrock Converse 2026 Integration) | *"CloudPulse AI is an autonomous Well-Architected and FinOps agent built on the Amazon Bedrock Converse API standard using Claude 3.5 Sonnet v2. Instead of merely alerting you, it parses your Terraform or OpenTofu HCL code, evaluates security and cost policies via native Bedrock tools, and automatically synthesizes zero-downtime, production-ready Git patches in seconds."* |
| **0:55 - 1:40** | **Live Demo: The Audit in Action** | Screen Share: CloudPulse AI Web Console (`http://localhost:3002`) | *"Let's see it live. Here on our console, we have a typical Terraform manifest containing an EC2 security group, an RDS postgres database, and a batch processor instance.*<br><br>*When I click 'Run Bedrock Converse Audit', CloudPulse AI triggers the Amazon Bedrock Converse API. Under the hood, Claude 3.5 Sonnet invokes our `audit_iac_manifest` and `estimate_finops_savings` tools in real time.*<br><br>*Within three seconds, look at what it found: a Critical vulnerability—open ingress on Port 22; a High risk—an unencrypted RDS database; and a Medium FinOps violation—an oversized `m5.4xlarge` instance."* |
| **1:40 - 2:15** | **Live Demo: FinOps ROI & Git Remediation** | Screen Share: FinOps Dashboard & Diff Visualizer | *"Notice the FinOps ROI breakdown: by rightsizing that dev instance and migrating to an AWS Graviton3 `m7g.large`, we reduce compute spend from \$561 down to \$70 a month—yielding \$340 in monthly savings, or \$4,080 annualized, while cutting carbon emissions by 60%.*<br><br>*Best of all, look at the remediation patch. CloudPulse AI didn't just tell us what to fix—it autonomously synthesized the exact Git diff. It restricted Port 22 to our corporate VPC CIDR, enabled KMS encryption on RDS, and updated the instance type—with zero downtime."* |
| **2:15 - 2:40** | **Automated Testing & Enterprise Reliability** | Slide 6 & Terminal: 7/7 Passing Tests | *"CloudPulse AI comes with an automated verification suite covering all seven core dimensions: HCL AST parsing, Well-Architected evaluation, Git diff synthesis, Bedrock Converse multi-turn tool calling, and FinOps calculations—all passing with 100% test reliability."* |
| **2:40 - 3:00** | **Vision & Closing** | Slide 8 (Roadmap & Call to Action) | *"CloudPulse AI turns days of tedious cloud remediation into a 3-second autonomous workflow, making enterprise AWS environments more secure, cost-effective, and sustainable from day one.*<br><br>*Check out our open-source repository on GitHub and test it today. Thank you to Amazon and Devpost!"* |

---

## 🎥 Recording & Presentation Instructions
1. **Screen Setup**: 1920x1080 (16:9 full-screen).
2. **Terminal Verification**: Run `node test/verify_cloudpulse.js` to ensure the test suite is green.
3. **App Running**: Start `node src/server.js` and open `http://localhost:3002`.
4. **Slide Deck**: Open `docs/pitch_deck.html` in Chrome/Edge, hit `F11`, and use arrow keys to navigate.
