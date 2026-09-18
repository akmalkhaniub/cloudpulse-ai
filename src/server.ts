import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { BedrockConverseAgent } from './bedrock_converse_agent.js';
import { RemediationSynthesizer } from './remediation_synthesizer.js';
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
export function createCloudPulseServer(): { server: http.Server; agent: BedrockConverseAgent } {
  const agent = new BedrockConverseAgent();

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
        return sendJson(res, 200, { status: 'online', service: 'CloudPulse AI', timestamp: new Date().toISOString(), bedrockMode: agent.isMock ? 'simulator' : 'live', modelId: agent.modelId });
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

  return { server, agent };
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
