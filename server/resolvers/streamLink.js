// Streaming de links directos (MediaFire / Drive / B2) con soporte de Range HTTP
import { Readable } from 'node:stream';
import { mimeFor, signedPlayUrl } from '../storage.js';
import { UA } from './common.js';
import { getDirectUrl, isAllowedHost } from './cloud.js';

export async function streamLink(req, res, link, key = '') {
  if (!key && !isAllowedHost(link)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('host no permitido');
    return;
  }
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const attempt = async (fresh) => {
    const url = key ? await signedPlayUrl(key) : await getDirectUrl(link, fresh);
    const headers = { 'User-Agent': UA };
    if (req.headers.range) headers.Range = req.headers.range;
    return fetch(url, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow', signal: ac.signal });
  };

  try {
    let up = await attempt(false);
    if (!key && (up.status >= 400 || (up.headers.get('content-type') || '').includes('text/html'))) {
      up.body?.cancel().catch(() => {});
      up = await attempt(true);
    }
    const ct = up.headers.get('content-type') || '';
    if (up.status >= 400 || (!key && ct.includes('text/html'))) {
      res.writeHead(502, { 'Content-Type': 'text/plain' }).end('El host no devolvió un video (link privado o vencido)');
      up.body?.cancel().catch(() => {});
      return;
    }
    const nameHint = (key || link).split('?')[0];
    const out = {
      'Content-Type': ct && !ct.includes('octet-stream') ? ct : mimeFor(nameHint, 'video/mp4'),
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': key ? 'private, max-age=3600' : 'no-store',
    };
    for (const h of ['content-length', 'content-range']) {
      const v = up.headers.get(h);
      if (v) out[h] = v;
    }
    res.writeHead(up.status, out);
    if (!up.body || req.method === 'HEAD') return res.end();
    Readable.fromWeb(up.body).on('error', () => res.destroy()).pipe(res);
  } catch (e) {
    if (ac.signal.aborted) return;
    if (!res.headersSent) res.writeHead(e.status || 502, { 'Content-Type': 'text/plain' });
    res.end(e.message);
  }
}
