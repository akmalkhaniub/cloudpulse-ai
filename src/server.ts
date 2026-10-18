import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { BedrockConverseAgent } from './bedrock_converse_agent.js';
import { RemediationSynthesizer } from './remediation_synthesizer.js';
import { AlexaMcpServer } from './alexa_mcp_server.js';
import { resolveSafePath, readJsonBody } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const sendJson = (res: http.ServerResponse, status: number, payload: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

/** Build the CloudPulse AI server without binding a port (testable). */
export function createCloudPulseServer(): { server: http.Server; agent: BedrockConverseAgent; mcp: AlexaMcpServer } {
  const agent = new BedrockConverseAgent();
  const mcp = new AlexaMcpServer(agent);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.url === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'online',
          service: 'CloudPulse AI',
          timestamp: new Date().toISOString(),
          bedrockMode: agent.isMock ? 'simulator' : 'live',
          modelId: agent.modelId,
          mcpServer: mcp.serverInfo.name,
          mcpToolsCount: mcp.listTools().length
        });
      }

      if (req.url === '/api/mcp' && req.method === 'GET') {
        res.setHeader('MCP-Protocol-Version', mcp.serverInfo.protocolVersion);
        return sendJson(res, 200, { serverInfo: mcp.serverInfo, tools: mcp.listTools() });
      }

      if (req.url === '/api/mcp' && req.method === 'POST') {
        const rpcReq = await readJsonBody(req);
        const headerVer = typeof req.headers['mcp-protocol-version'] === 'string' ? req.headers['mcp-protocol-version'] : undefined;
        const rpcRes = await mcp.handleJsonRpc(rpcReq as any, headerVer);
        res.setHeader('MCP-Protocol-Version', rpcRes._meta?.['io.modelcontextprotocol/protocolVersion'] ?? mcp.serverInfo.protocolVersion);
        return sendJson(res, 200, rpcRes);
      }

      if (req.url === '/api/alexa' && req.method === 'POST') {
        const { utterance, hclContent, transcript } = await readJsonBody(req);
        if (!utterance || typeof utterance !== 'string') {
          return sendJson(res, 400, { error: 'An Alexa voice "utterance" string is required.' });
        }
        const voiceRes = await mcp.handleAlexaUtterance(utterance, String(hclContent || ''), {
          transcript: typeof transcript === 'string' ? transcript : undefined
        });
        return sendJson(res, 200, voiceRes);
      }

      if (req.url === '/api/bee/ingest' && req.method === 'POST') {
        const { transcript, hclContent } = await readJsonBody(req);
        const beeRes = await mcp.callTool('ingest_bee_meeting_transcript', { transcript, hclContent });
        return sendJson(res, 200, beeRes);
      }

      if (req.url === '/api/firetv/wallboard' && req.method === 'POST') {
        const { hclContent } = await readJsonBody(req);
        const tvRes = await mcp.callTool('get_firetv_wallboard_state', { hclContent });
        return sendJson(res, 200, tvRes);
      }

      if (req.url === '/api/audit' && req.method === 'POST') {
        const { hclContent, prompt } = await readJsonBody(req);
        const result = await agent.runConverseTurn(prompt || 'Audit this Terraform manifest against AWS Well-Architected Pillars.', hclContent || '');
        return sendJson(res, 200, result);
      }

      if (req.url === '/api/remediate' && req.method === 'POST') {
        const { finding, hclContent } = await readJsonBody(req);
        if (!finding || !finding.ruleId) return sendJson(res, 400, { error: 'A "finding" with a ruleId is required.' });
        return sendJson(res, 200, RemediationSynthesizer.generatePatch(finding, hclContent || ''));
      }

      const filePath = resolveSafePath(PUBLIC_DIR, req.url);
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, content) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500;
          res.writeHead(code, { 'Content-Type': 'text/plain' });
          res.end(code === 404 ? '404 Not Found' : 'Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(content);
        }
      });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      sendJson(res, e.statusCode || 400, { error: e.message });
    }
  });

  return { server, agent, mcp };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const PORT = process.env.PORT || 3002;
  const { server } = createCloudPulseServer();
  server.listen(PORT, () => {
    console.log(`☁️ CloudPulse AI Server running at http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  });
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
