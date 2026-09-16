#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
GCP_REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="cloudpulse-ai"
IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}:latest"

echo "🚀 [GCP Deploy] Submitting CloudPulse AI to Cloud Build..."
gcloud builds submit --tag "${IMAGE_URI}" .

echo "☁️ Deploying to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_URI}" \
  --region "${GCP_REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars NODE_ENV=production,PORT=8080

echo "✅ CloudPulse AI is live on Google Cloud Run:"
gcloud run services describe "${SERVICE_NAME}" --platform managed --region "${GCP_REGION}" --format 'value(status.url)'
