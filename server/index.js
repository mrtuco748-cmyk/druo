// Druo — servidor: web estática + API + WebSocket (señalización WebRTC y sincronización).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room } from './room.js';
import { getIceServers, turnConfigured } from './turn.js';
import * as storage from './storage.js';
import { classify, streamLink } from './resolve.js';

try {
  process.loadEnvFile(); // .env local (en Render se usan variables de entorno)
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT) || 8787;

const room = new Room();

// ---------------------------------------------------------------- HTTP helpers
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('body demasiado grande'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  let file = path.join(DIST, decodeURIComponent(pathname));
  if (!file.startsWith(DIST)) return json(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Druo: falta compilar el cliente (npm run build)');
  }
  const ext = path.extname(file);
  const immutable = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

function needStorage() {
  if (!storage.storageConfigured()) throw Object.assign(new Error('Almacenamiento no configurado'), { status: 503 });
}

// ---------------------------------------------------------------- rutas API
const routes = {
  'GET /health': () => ({ ok: true, peers: room.peers.size, uptime: Math.round(process.uptime()) }),
  'GET /api/config': () => ({ storage: storage.storageConfigured(), turn: turnConfigured() }),
  'GET /api/ice': async () => ({ iceServers: await getIceServers() }),
  'GET /api/library': async () => (needStorage(), storage.listLibrary()),
  'POST /api/upload/start': async (b) => (needStorage(), storage.startUpload(b)),
  'POST /api/upload/part-url': async (b) => (needStorage(), storage.partUrl(b)),
  'POST /api/upload/parts': async (b) => (needStorage(), storage.listParts(b)),
  'POST /api/upload/complete': async (b) => (needStorage(), storage.completeUpload(b)),
  'POST /api/upload/abort': async (b) => (needStorage(), storage.abortUpload(b)),
  'POST /api/play-url': async (b) => (needStorage(), storage.playUrl(b.key)),
  'POST /api/library/delete': async (b) => (needStorage(), storage.deleteKeys(b.keys || [])),
  'POST /api/resolve': async (b) => classify(b.url),
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = `${req.method} ${url.pathname}`;
  try {
    if (key === 'GET /api/stream') return await streamLink(req, res, url.searchParams.get('link') || '');
    const handler = routes[key];
    if (handler) {
      const body = req.method === 'POST' ? await readBody(req) : null;
      return json(res, 200, await handler(body, req));
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'no existe' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'método no permitido' });
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(`[http] ${key}:`, e.message);
    if (!res.headersSent) json(res, e.status || 500, { error: e.message });
  }
});

// ---------------------------------------------------------------- WebSocket
const wss = new WebSocketServer({ noServer: true, maxPayload: 2 * 1024 * 1024, perMessageDeflate: false });

server.on('upgrade', (req, socket, head) => {
  if (new URL(req.url, 'http://x').pathname !== '/ws') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

const send = (ws, msg) => ws && ws.readyState === 1 && ws.send(JSON.stringify(msg));
const broadcast = (msg) => room.peers.forEach((p) => send(p.ws, msg));
const toOther = (id, msg) => send(room.other(id)?.ws, msg);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
  let me = null;

  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    ws.isAlive = true;

    if (m.t === 'ping') return send(ws, { t: 'pong', c: m.c, s: Date.now() });

    if (m.t === 'hello') {
      const r = room.join(m, ws);
      if (!r.ok) {
        send(ws, { t: 'error', reason: r.reason });
        return ws.close(4001, r.reason);
      }
      me = r.peer;
      if (r.replaced) {
        send(r.replaced.ws, { t: 'error', reason: 'replaced' });
        r.replaced.ws.close(4002, 'replaced');
      }
      send(ws, { t: 'welcome', you: { id: me.id, seat: me.seat }, now: Date.now(), state: room.snapshot() });
      broadcast({ t: 'peers', peers: room.peerList() });
      console.log(`[ws] entra ${me.name} (${me.seat}, ${me.device}) — ${room.peers.size}/2`);
      return;
    }
    if (!me) return;
    me.lastSeen = Date.now();

    switch (m.t) {
      case 'signal':
        return toOther(me.id, { t: 'signal', from: me.id, session: me.session, data: m.data });
      case 'sync': {
        const playback = room.setPlayback(m.state, me.id, m.at);
        return toOther(me.id, { t: 'sync', playback, by: me.id, reason: m.reason || null });
      }
      case 'source':
        room.setSource(m.source, me.id);
        return broadcast({ t: 'source', source: room.source, playback: room.playback, by: me.id });
      case 'subs':
        room.subs = m.subs ? { name: String(m.subs.name || '').slice(0, 120), text: String(m.subs.text || ''), offset: Number(m.subs.offset) || 0 } : null;
        return broadcast({ t: 'subs', subs: room.subs, by: me.id });
      case 'cam':
        room.cams[me.id] = { zoom: Number(m.zoom) || 1, y: Number(m.y) || 0, on: m.on !== false, mic: m.mic !== false };
        return toOther(me.id, { t: 'cam', id: me.id, ...room.cams[me.id] });
      case 'buffering':
      case 'cap':
      case 'react':
      case 'draw':
        return toOther(me.id, { ...m, from: me.id });
    }
  });

  ws.on('close', () => {
    if (me && room.leave(me.id, ws)) {
      console.log(`[ws] sale ${me.name} — ${room.peers.size}/2`);
      broadcast({ t: 'peers', peers: room.peerList() });
    }
  });
});

// Detecta conexiones muertas (celular que se bloqueó, wifi que se cayó…)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {}
  }
}, 10_000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Druo escuchando en http://localhost:${PORT}`);
  console.log(`  almacenamiento B2: ${storage.storageConfigured() ? 'sí' : 'no'} · TURN Cloudflare: ${turnConfigured() ? 'sí' : 'no'}`);
});
