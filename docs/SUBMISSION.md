# CloudPulse submission notes

Deadline 23 Oct 2026.

## What a judge can run today

```bash
npm install
npm run dev
```

Open http://localhost:3002 and run the audit. Bedrock falls back to the local simulator when AWS credentials are missing or rejected. Savings come from the us-east-1 price table in `src/well_architected_engine.ts`.

Before and after Terraform for the sample manifest:

- `docs/sample-main.tf`
- `docs/sample-remediated.tf`

`src/github_pr.ts` opens a pull request only when `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are set. Without them it returns a dry run.

## Not in this submission

No live Bedrock call (the configured AWS token was rejected) and no public URL.
