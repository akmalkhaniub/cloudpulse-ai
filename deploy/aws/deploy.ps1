param (
    [string]$Region = "us-east-1",
    [string]$RepoName = "cloudpulse-ai",
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
Write-Host "🚀 [AWS Deploy] Publishing CloudPulse AI to AWS ECR ($Region)..." -ForegroundColor Cyan

$AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$RepoName`:$Tag"

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"

$repoCheck = aws ecr describe-repositories --repository-names $RepoName --region $Region 2>$null
if (-not $repoCheck) {
    aws ecr create-repository --repository-name $RepoName --region $Region | Out-Null
}

docker build -t $EcrUri -f Dockerfile .
docker push $EcrUri

Write-Host "✅ Successfully pushed CloudPulse AI to Amazon ECR: $EcrUri" -ForegroundColor Green
