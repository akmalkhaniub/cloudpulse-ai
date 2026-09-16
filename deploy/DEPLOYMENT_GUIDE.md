# ☁️ CloudPulse AI — Multi-Cloud Deployment Guide

Deploy **CloudPulse AI** across **AWS, GCP, Azure, and Kubernetes**.

---

## 1. Local Docker
```bash
docker build -t cloudpulse-ai:latest .
docker run -d -p 3002:3002 --name cloudpulse cloudpulse-ai:latest
curl http://localhost:3002/api/health
```

---

## 2. Amazon Web Services (AWS App Runner / ECS)
```bash
# Build and push to ECR
./deploy/aws/deploy.sh
# Windows PowerShell
./deploy/aws/deploy.ps1 -Region us-east-1
```

---

## 3. Google Cloud Platform (Google Cloud Run)
```bash
# Deploy to Google Cloud Run
./deploy/gcp/deploy.sh
# Windows PowerShell
./deploy/gcp/deploy.ps1 -ProjectId YOUR_PROJECT_ID
```

---

## 4. Microsoft Azure (Azure Container Apps)
```bash
# Deploy to Azure Container Apps
./deploy/azure/deploy.sh
# Windows PowerShell
./deploy/azure/deploy.ps1
```

---

## 5. Kubernetes (EKS / GKE / AKS / Local)
```bash
kubectl apply -k deploy/k8s/
kubectl get pods -l app=cloudpulse-ai
```

---

## 6. Health Verification
```bash
curl https://YOUR_DEPLOYED_URL/api/health
# Returns: {"status":"online","service":"CloudPulse AI"}
```
