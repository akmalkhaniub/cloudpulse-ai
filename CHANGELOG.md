# Changelog

## [Unreleased]

### Migrated to TypeScript (2026-09-18)
- Ported IaC parser, Well-Architected engine, remediation synthesizer, Bedrock
  Converse agent, and server from JavaScript to **TypeScript** (strict) with typed
  resources, findings, and Converse result shapes.

### Fixed
- **Live Bedrock mode never worked**: `runConverseTurn` called `processBedrockResponse`,
  which was never defined — every live attempt threw and silently fell back to the
  simulator. Implemented a real Converse tool-use loop (execute toolUse blocks, feed
  toolResult blocks back for a final turn) and normalized the response.

### Added
- Real `@aws-sdk/client-bedrock-runtime` dependency so live mode genuinely works
  when AWS credentials are present; deterministic simulator fallback otherwise.
- Server integration suite (`test/server_integration.ts`, 9 assertions): health,
  /api/audit (Converse), /api/remediate, and security guards.
- Security: path-traversal guard (403), 256 KB request-body cap (413), input validation.
- `createCloudPulseServer()` factory (testable), graceful shutdown, CI, multi-stage
  Dockerfile, `engines.node >= 18`.

### Notes
- With no AWS credentials the agent runs a deterministic simulator that adheres to the
  Bedrock Converse schema; set AWS credentials + Bedrock model access for live calls.
