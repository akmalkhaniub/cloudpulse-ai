# 🆓 Free Tier Deployment Guide for CloudPulse AI

Deploy **CloudPulse AI** with **Render Blueprints**, **Cloudflare Tunnels**, and **GroqCloud Free Inference**.

---

## 1. Free Web Service: Render.com
1. Push code to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) > **Blueprints**.
3. Select your `cloudpulse-ai` repo. Render reads `render.yaml` and launches your container on port 3002.

---

## 2. Instant Live Judge Demo: Cloudflare Tunnel
```powershell
# Windows
.\deploy\free\tunnel.ps1 -Port 3002

# Linux / macOS
./deploy/free/tunnel.sh 3002
```

---

## 3. Zero-Cost LLM Fallback (GroqCloud)
If you do not have active AWS Bedrock credentials, CloudPulse AI can use **GroqCloud (Llama 3.3 70B)** for sub-second Terraform security audits:
- Sign up at [console.groq.com](https://console.groq.com) for a free API key.
- Set `GROQ_API_KEY=gsk_...` in your environment.
