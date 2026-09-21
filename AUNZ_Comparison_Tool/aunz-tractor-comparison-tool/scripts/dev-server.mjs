import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const requestedPath = path.join(distDir, safePath.replace(/^\//, ''));

  if (!requestedPath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    const ext = path.extname(requestedPath).toLowerCase();
    const typeMap = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': typeMap[ext] || 'application/octet-stream' });
    res.end(readFileSync(requestedPath));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(4173, '0.0.0.0', () => {
  console.log('Local preview running at http://localhost:4173');
});
