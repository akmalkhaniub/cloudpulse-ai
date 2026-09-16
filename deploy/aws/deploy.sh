#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="cloudpulse-ai"
IMAGE_TAG="latest"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "🚀 [AWS Deploy] Deploying CloudPulse AI to Amazon ECR (${AWS_REGION})..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region "${AWS_REGION}" || \
  aws ecr create-repository --repository-name "${ECR_REPO_NAME}" --region "${AWS_REGION}"

docker build -t "${ECR_URI}" -f Dockerfile .
docker push "${ECR_URI}"

echo "✅ Published CloudPulse AI to Amazon ECR: ${ECR_URI}"
