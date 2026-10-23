import assert from 'assert';
import { createCloudPulseServer } from '../src/server.js';

console.log('🧪 Starting CloudPulse AI Server Integration Suite...\n');

let passed = 0;
function ok(label: string, cond: boolean): void {
  assert(cond, label);
  passed++;
  console.log(`   ✅ ${label}`);
}

const HCL = 'resource "aws_security_group" "web" {\n  ingress {\n    from_port = 22\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}';

const { server } = createCloudPulseServer();
await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as import('net').AddressInfo;
const base = `http://127.0.0.1:${port}`;
const get = (p: string) => fetch(base + p).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));
const post = (p: string, body: unknown) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as any }));

try {
  console.log('1️⃣ Health & startup...');
  const health = await get('/api/health');
  ok('server boots and /api/health returns 200', health.status === 200);
  ok('reports a bedrock mode', health.body.bedrockMode === 'simulator' || health.body.bedrockMode === 'live');

  console.log('\n2️⃣ Audit endpoint (Bedrock Converse)...');
  const audit = await post('/api/audit', { hclContent: HCL });
  ok('audit returns 200', audit.status === 200);
  ok('surfaces the open-SSH violation', audit.body.audit.findings.some((f: any) => f.ruleId === 'SEC_OPEN_SSH_INGRESS'));
  ok('triggers a tool call', audit.body.toolCalls.length > 0);

  console.log('\n3️⃣ Remediate endpoint...');
  const rem = await post('/api/remediate', { finding: { ruleId: 'SEC_OPEN_SSH_INGRESS' }, hclContent: HCL });
  ok('remediate returns a diff', rem.status === 200 && rem.body.diff.includes('10.0.0.0/16'));
  ok('missing finding -> 400', (await post('/api/remediate', {})).status === 400);

  console.log('\n4️⃣ Security guards...');
  ok('encoded path traversal blocked (403)', (await fetch(base + '/..%2f..%2fserver.ts')).status === 403);
  ok('oversized body rejected (413)', (await post('/api/audit', { hclContent: 'x'.repeat(300 * 1024) })).status === 413);

  console.log('\n5️⃣ Alexa+ MCP Server (/api/mcp • Spec 2026-07-28), Bee Wearable (/api/bee/ingest), & Fire TV (/api/firetv/wallboard)...');
  const mcpInfo = await get('/api/mcp');
  ok('GET /api/mcp returns 7 registered MCP tools & protocolVersion 2026-07-28', mcpInfo.status === 200 && mcpInfo.body.tools.length === 7 && mcpInfo.body.serverInfo.protocolVersion === '2026-07-28');
  ok('All 7 MCP tools include MCP 2026-07-28 title, outputSchema (JSON Schema 2020-12), and annotations', mcpInfo.body.tools.every((t: any) => t.title && t.outputSchema?.$schema === 'https://json-schema.org/draft/2020-12/schema' && t.annotations));

  // Every tool's real output must satisfy its declared outputSchema (strict MCP clients validate this).
  const typeOf = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  let schemaOk = true;
  for (const t of mcpInfo.body.tools) {
    const r = await post('/api/mcp', { jsonrpc: '2.0', id: t.name, method: 'tools/call', params: { name: t.name, arguments: { hclContent: HCL } } });
    const out = r.body.result?.structuredContent || {};
    for (const k of t.outputSchema.required) {
      const allowed = [].concat(t.outputSchema.properties[k].type);
      if (!(k in out) || !allowed.includes(typeOf(out[k]) as never)) { schemaOk = false; console.log(`   ✗ ${t.name}.${k}`); }
    }
  }
  ok('every tool result matches its declared outputSchema', schemaOk);

  // Edge cases found in the final QC pass.
  const ping = await post('/api/mcp', { jsonrpc: '2.0', id: 'p', method: 'ping' });
  ok('MCP ping returns an empty result', ping.body.result && Object.keys(ping.body.result).length === 0);
  const noArgs = await post('/api/mcp', { jsonrpc: '2.0', id: 'n', method: 'tools/call', params: { name: 'ship_github_remediation_pr', arguments: {} } });
  ok('missing required tool arguments return isError instead of shipping an empty PR', noArgs.body.result?.isError === true);
  const empty = await post('/api/alexa', { utterance: 'Alexa, fix it', hclContent: '' });
  ok('"fix it" on an empty manifest opens no PR and says so', empty.body.data.prMode === 'skipped' && /didn't open a pull request/.test(empty.body.spokenSpeech));
  const HIGH_ONLY = 'resource "aws_db_instance" "db" {\n  engine            = "postgres"\n  storage_encrypted = false\n  multi_az          = true\n}';
  const brief = await post('/api/alexa', { utterance: 'Alexa, morning briefing', hclContent: HIGH_ONLY });
  ok('briefing never claims an all-clear when a HIGH finding exists', !/zero high-risk|every check passed/i.test(brief.body.spokenSpeech) && /high-severity/.test(brief.body.spokenSpeech));

  const rpcInit = await post('/api/mcp', {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }
  });
  ok('MCP JSON-RPC initialize returns serverInfo & _meta protocolVersion 2026-07-28', rpcInit.status === 200 && rpcInit.body.result.serverInfo.name === 'cloudpulse-alexa-plus-mcp' && rpcInit.body.result._meta['io.modelcontextprotocol/protocolVersion'] === '2026-07-28');

  const rpcBadVer = await post('/api/mcp', {
    jsonrpc: '2.0',
    id: 99,
    method: 'tools/list',
    _meta: { 'io.modelcontextprotocol/protocolVersion': '1999-01-01' }
  });
  ok('MCP 2026-07-28 rejects unknown protocolVersion with UnsupportedProtocolVersionError', rpcBadVer.body.error?.code === -32602 && Array.isArray(rpcBadVer.body.error?.data?.supportedVersions));

  const rpcCall = await post('/api/mcp', {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' },
    params: { name: 'get_morning_cloud_briefing', arguments: { hclContent: HCL, engineerName: 'Akmal' } }
  });
  ok('MCP tools/call executes get_morning_cloud_briefing with structuredContent', rpcCall.status === 200 && rpcCall.body.result.structuredContent.violationsCount === 1);

  const alexaBrief = await post('/api/alexa', { utterance: 'Alexa, give me my morning cloud briefing', hclContent: HCL });
  ok('POST /api/alexa routes morning briefing utterance', alexaBrief.status === 200 && alexaBrief.body.matchedIntent === 'MorningCloudBriefing');

  const alexaShip = await post('/api/alexa', { utterance: 'Alexa, fix all violations and ship a pull request', hclContent: HCL });
  ok('POST /api/alexa routes PR shipping utterance', alexaShip.status === 200 && alexaShip.body.matchedIntent === 'SynthesizeAndShipPR');

  const DB_HCL = HCL + '\n\nresource "aws_db_instance" "app_db" {\n  engine            = "postgres"\n  storage_encrypted = false\n}';
  const shipSafe = await post('/api/alexa', { utterance: 'Alexa, fix it', hclContent: DB_HCL });
  ok('"fix it" holds the database replacement back for approval', shipSafe.body.data.approvalRequired === true && !shipSafe.body.data.rulesRemediated.includes('SEC_UNENCRYPTED_DB') && /approve/i.test(shipSafe.body.spokenSpeech));
  const approve = await post('/api/alexa', { utterance: 'Alexa, approve the database change', hclContent: DB_HCL });
  ok('"approve" ships the held-back change with its snapshot guard', approve.body.matchedIntent === 'ApproveDisruptiveChanges' && approve.body.data.rulesRemediated.includes('SEC_UNENCRYPTED_DB') && approve.body.data.combinedDiff.includes('final_snapshot_identifier'));
  const risk = await post('/api/alexa', { utterance: 'Alexa, is it safe to fix everything?', hclContent: DB_HCL });
  ok('risk questions route to assess_change_risk', risk.body.matchedIntent === 'AssessChangeRisk' && risk.body.data.needsApproval.length === 1);

  const beeSync = await post('/api/bee/ingest', { hclContent: HCL });
  ok('POST /api/bee/ingest extracts standup action items and cross-verifies against Terraform AST', beeSync.status === 200 && beeSync.body.extractedActionItems.length >= 3 && beeSync.body.verifiedInTerraformCount >= 1);

  const fireTv = await post('/api/firetv/wallboard', { hclContent: HCL });
  ok('POST /api/firetv/wallboard returns 10-foot NOC wallboard tiles with D-Pad navigation', fireTv.status === 200 && fireTv.body.dpadNavigationSupported === true && fireTv.body.tiles.length >= 1);

  console.log(`\n🎉 ALL ${passed} CLOUDPULSE UNIFIED AMAZON ECOSYSTEM INTEGRATION ASSERTIONS PASSED.\n`);
} finally {
  server.close();
}

