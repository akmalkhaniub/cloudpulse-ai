param (
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [string]$ServiceName = "cloudpulse-ai"
)

$ErrorActionPreference = "Stop"

if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null).Trim()
}

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/cloud-run-source-deploy/$ServiceName`:latest"

Write-Host "🚀 [GCP Deploy] Submitting CloudPulse AI to Cloud Build..." -ForegroundColor Cyan
gcloud builds submit --tag $ImageUri .

Write-Host "☁️ Deploying to Google Cloud Run ($Region)..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
  --image $ImageUri `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --cpu 1 `
  --memory 512Mi `
  --set-env-vars NODE_ENV=production,PORT=8080

$ServiceUrl = (gcloud run services describe $ServiceName --platform managed --region $Region --format 'value(status.url)').Trim()
Write-Host "✅ CloudPulse AI deployed successfully: $ServiceUrl" -ForegroundColor Green
