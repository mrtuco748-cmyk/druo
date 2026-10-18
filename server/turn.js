// Credenciales ICE: STUN gratis + TURN de Cloudflare (si hay credenciales).

const STUN = [
  {
    urls: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];
let cache = { at: 0, servers: null };
const TTL = 24 * 3600;

function stripPort53(servers) {
  // Los navegadores bloquean el puerto 53 y se cuelgan intentándolo.
  return servers
    .map((s) => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u));
      return { ...s, urls };
    })
    .filter((s) => s.urls.length);
}

export function turnConfigured() {
  return !!(process.env.CF_TURN_KEY_ID && process.env.CF_TURN_API_TOKEN);
}

export async function getIceServers() {
  if (!turnConfigured()) return STUN;
  if (cache.servers && Date.now() - cache.at < (TTL / 2) * 1000) return cache.servers;

  const base = `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CF_TURN_KEY_ID}/credentials`;
  const opts = {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CF_TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL }),
  };
  try {
    let r = await fetch(`${base}/generate-ice-servers`, opts);
    let servers;
    if (r.ok) {
      servers = (await r.json()).iceServers;
    } else {
      r = await fetch(`${base}/generate`, opts);
      if (!r.ok) throw new Error(`TURN ${r.status}: ${await r.text()}`);
      const j = await r.json();
      servers = [j.iceServers];
    }
    servers = stripPort53(Array.isArray(servers) ? servers : [servers]);
    cache = { at: Date.now(), servers: [...STUN, ...servers] };
    return cache.servers;
  } catch (e) {
    console.error('[turn] no pude generar credenciales:', e.message);
    return STUN;
  }
}
