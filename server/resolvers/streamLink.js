// Streaming de links directos (MediaFire / Drive) con soporte de Range HTTP
import { Readable } from 'node:stream';
import { mimeFor } from '../storage.js';
import { UA } from './common.js';
import { getDirectUrl, isAllowedHost } from './cloud.js';

export async function streamLink(req, res, link) {
  if (!isAllowedHost(link)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('host no permitido');
    return;
  }
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const attempt = async (fresh) => {
    const url = await getDirectUrl(link, fresh);
    const headers = { 'User-Agent': UA };
    if (req.headers.range) headers.Range = req.headers.range;
    return fetch(url, { headers, redirect: 'follow', signal: ac.signal });
  };

  try {
    let up = await attempt(false);
    if (up.status >= 400 || (up.headers.get('content-type') || '').includes('text/html')) {
      up.body?.cancel().catch(() => {});
      up = await attempt(true);
    }
    const ct = up.headers.get('content-type') || '';
    if (up.status >= 400 || ct.includes('text/html')) {
      res.writeHead(502, { 'Content-Type': 'text/plain' }).end('El host no devolvió un video (link privado o vencido)');
      up.body?.cancel().catch(() => {});
      return;
    }
    const out = {
      'Content-Type': ct && !ct.includes('octet-stream') ? ct : mimeFor(link.split('?')[0], 'video/mp4'),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    };
    for (const h of ['content-length', 'content-range']) {
      const v = up.headers.get(h);
      if (v) out[h] = v;
    }
    res.writeHead(up.status, out);
    if (!up.body) return res.end();
    Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
  } catch (e) {
    if (ac.signal.aborted) return;
    if (!res.headersSent) res.writeHead(e.status || 502, { 'Content-Type': 'text/plain' });
    res.end(e.message);
  }
}
