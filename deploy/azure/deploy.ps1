param (
    [string]$ResourceGroup = "cloudpulse-rg",
    [string]$Location = "eastus",
    [string]$EnvironmentName = "cloudpulse-env",
    [string]$AppName = "cloudpulse-ai"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 [Azure Deploy] Checking Resource Group '$ResourceGroup'..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location -o table

Write-Host "📦 Ensuring Container Apps Environment '$EnvironmentName'..." -ForegroundColor Yellow
az containerapp env create --name $EnvironmentName --resource-group $ResourceGroup --location $Location -o table

Write-Host "🔨 Deploying CloudPulse AI via 'az containerapp up'..." -ForegroundColor Yellow
az containerapp up `
  --name $AppName `
  --resource-group $ResourceGroup `
  --environment $EnvironmentName `
  --source . `
  --target-port 3002 `
  --ingress external `
  --env-vars NODE_ENV=production PORT=3002

$Fqdn = (az containerapp show --name $AppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv).Trim()
Write-Host "✅ CloudPulse AI is live on Microsoft Azure: https://$Fqdn" -ForegroundColor Green
