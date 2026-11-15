// Manejo de conexiones WebSocket y ciclo de vida de clientes
import { WebSocketServer } from 'ws';
import { dispatchWsMessage } from './wsDispatch.js';

export function setupWebSocket(server, room) {
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
      dispatchWsMessage({ m, me, room, send, broadcast, toOther });
    });

    ws.on('close', () => {
      if (me && room.leave(me.id, ws)) {
        console.log(`[ws] sale ${me.name} — ${room.peers.size}/2`);
        broadcast({ t: 'peers', peers: room.peerList() });
      }
    });
  });

  // Detecta conexiones muertas
  setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
  }, 30_000).unref();

  return wss;
}
