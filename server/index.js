// Druo — servidor principal: web estática + API + WebSocket
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRoutes } from './apiRoutes.js';
import { proxyHls, streamLink } from './resolve.js';
import { Room } from './room.js';
import { json, readBody, serveStatic } from './staticServer.js';
import * as storage from './storage.js';
import { turnConfigured } from './turn.js';
import { setupWebSocket } from './wsHandler.js';

try {
  process.loadEnvFile();
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT) || 8787;

const room = new Room();
const routes = createApiRoutes(room);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  const url = new URL(req.url, 'http://x');
  const key = `${req.method} ${url.pathname}`;
  try {
    if (url.pathname === '/api/hls-proxy' && (req.method === 'GET' || req.method === 'HEAD')) {
      return await proxyHls(req, res, url.searchParams.get('url') || '', url.searchParams.get('ref') || '');
    }
    if (url.pathname === '/api/stream' && (req.method === 'GET' || req.method === 'HEAD')) {
      return await streamLink(req, res, url.searchParams.get('link') || '');
    }
    const handler = routes[key];
    if (handler) {
      const body = req.method === 'POST' ? await readBody(req) : null;
      return json(res, 200, await handler(body, req));
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'no existe' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'método no permitido' });
    return serveStatic(req, res, url.pathname, DIST);
  } catch (e) {
    console.error(`[http] ${key}:`, e.message);
    if (!res.headersSent) json(res, e.status || 500, { error: e.message });
  }
});

setupWebSocket(server, room);

// Keepalive para Render
const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://druo.onrender.com';
setInterval(async () => {
  if (room.peers.size > 0 && renderUrl.startsWith('http')) {
    try {
      const r = await fetch(`${renderUrl}/health`);
      if (r.ok) console.log(`[keepalive] Ping a ${renderUrl}/health (${room.peers.size} en sala)`);
    } catch (e) {
      console.warn(`[keepalive] Aviso ping:`, e.message);
    }
  }
}, 6 * 60 * 1000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Druo escuchando en http://localhost:${PORT}`);
  console.log(
    `  almacenamiento B2: ${storage.storageConfigured() ? 'sí' : 'no'} · TURN Cloudflare: ${turnConfigured() ? 'sí' : 'no'}`
  );
});
