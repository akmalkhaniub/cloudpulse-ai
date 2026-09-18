import path from 'path';

/** Resolve a request URL to a file inside `publicDir`, rejecting path traversal. */
export function resolveSafePath(publicDir: string, urlPath: string | undefined): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch {
    return null;
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, relative);
  if (resolved !== publicDir && !resolved.startsWith(publicDir + path.sep)) return null;
  return resolved;
}

/** Read and JSON-parse a request body with a hard size cap (default 256 KB — IaC files can be large). */
export function readJsonBody(
  req: import('http').IncomingMessage,
  { limitBytes = 256 * 1024 }: { limitBytes?: number } = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let aborted = false;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      size += chunk.length;
      if (size > limitBytes) {
        aborted = true;
        const err = new Error('Request body too large') as Error & { statusCode?: number };
        err.statusCode = 413;
        reject(err);
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('Invalid JSON body') as Error & { statusCode?: number };
        err.statusCode = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
