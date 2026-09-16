#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-cloudpulse-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-cloudpulse-env}"
APP_NAME="${APP_NAME:-cloudpulse-ai}"

echo "🚀 [Azure Deploy] Deploying CloudPulse AI to Azure Container Apps..."
az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" -o table || true
az containerapp env create --name "${ENVIRONMENT_NAME}" --resource-group "${RESOURCE_GROUP}" --location "${LOCATION}" -o table || true

az containerapp up \
  --name "${APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --environment "${ENVIRONMENT_NAME}" \
  --source . \
  --target-port 3002 \
  --ingress external \
  --env-vars NODE_ENV=production PORT=3002

echo "✅ CloudPulse AI deployed to Azure:"
az containerapp show --name "${APP_NAME}" --resource-group "${RESOURCE_GROUP}" --query "properties.configuration.ingress.fqdn" -o tsv
