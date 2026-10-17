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

  console.log('\n5️⃣ Alexa+ MCP Server (/api/mcp), Bee Wearable (/api/bee/ingest), & Fire TV (/api/firetv/wallboard)...');
  const mcpInfo = await get('/api/mcp');
  ok('GET /api/mcp returns 6 registered MCP tools', mcpInfo.status === 200 && mcpInfo.body.tools.length === 6);

  const rpcInit = await post('/api/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize' });
  ok('MCP JSON-RPC initialize returns serverInfo', rpcInit.status === 200 && rpcInit.body.result.serverInfo.name === 'cloudpulse-alexa-plus-mcp');

  const rpcCall = await post('/api/mcp', {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'get_morning_cloud_briefing', arguments: { hclContent: HCL, engineerName: 'Akmal' } }
  });
  ok('MCP tools/call executes get_morning_cloud_briefing', rpcCall.status === 200 && rpcCall.body.result.structuredContent.violationsCount === 1);

  const alexaBrief = await post('/api/alexa', { utterance: 'Alexa, give me my morning cloud briefing', hclContent: HCL });
  ok('POST /api/alexa routes morning briefing utterance', alexaBrief.status === 200 && alexaBrief.body.matchedIntent === 'MorningCloudBriefing');

  const alexaShip = await post('/api/alexa', { utterance: 'Alexa, fix all violations and ship a pull request', hclContent: HCL });
  ok('POST /api/alexa routes PR shipping utterance', alexaShip.status === 200 && alexaShip.body.matchedIntent === 'SynthesizeAndShipPR');

  const beeSync = await post('/api/bee/ingest', { hclContent: HCL });
  ok('POST /api/bee/ingest extracts standup action items and cross-verifies against Terraform AST', beeSync.status === 200 && beeSync.body.extractedActionItems.length >= 3 && beeSync.body.verifiedInTerraformCount >= 1);

  const fireTv = await post('/api/firetv/wallboard', { hclContent: HCL });
  ok('POST /api/firetv/wallboard returns 10-foot NOC wallboard tiles with D-Pad navigation', fireTv.status === 200 && fireTv.body.dpadNavigationSupported === true && fireTv.body.tiles.length >= 1);

  console.log(`\n🎉 ALL ${passed} CLOUDPULSE UNIFIED AMAZON ECOSYSTEM INTEGRATION ASSERTIONS PASSED.\n`);
} finally {
  server.close();
}

