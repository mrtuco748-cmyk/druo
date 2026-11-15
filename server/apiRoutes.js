// Definición de endpoints REST y llamadas a storage / resolvers
import { classify } from './resolve.js';
import * as storage from './storage.js';
import { getIceServers, turnConfigured } from './turn.js';

function needStorage() {
  if (!storage.storageConfigured()) throw Object.assign(new Error('Almacenamiento no configurado'), { status: 503 });
}

export function createApiRoutes(room) {
  return {
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
    'POST /api/keepalive': async () => ({
      ok: true,
      peers: room.peers.size,
      uptime: Math.round(process.uptime()),
      serverTime: Date.now(),
    }),
  };
}
