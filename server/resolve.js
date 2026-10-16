// Resolución de links pegados por el usuario (YouTube, MediaFire, Google Drive, Dropbox, MP4/HLS directo)
// y streaming con soporte de Range para los hosts que no dan link directo reproducible.

import { Readable } from 'node:stream';
import { mimeFor } from './storage.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

export function youtubeId(url) {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function driveId(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

/** Clasifica un link. Devuelve la fuente que se comparte con la sala. */
export function classify(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    const e = new Error('Eso no parece un link');
    e.status = 400;
    throw e;
  }
  if (!/^https?:$/.test(url.protocol)) {
    const e = new Error('Solo links http/https');
    e.status = 400;
    throw e;
  }
  const href = url.href;
  const yt = youtubeId(href);
  if (yt) return { kind: 'youtube', id: yt, title: 'YouTube' };

  const host = url.hostname.replace(/^www\./, '');
  const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || host);

  if (host.endsWith('mediafire.com')) return { kind: 'file', url: `/api/stream?link=${encodeURIComponent(href)}`, title: name, via: 'mediafire' };
  if (host === 'drive.google.com') {
    const id = driveId(href);
    if (!id) {
      const e = new Error('No encontré el id del archivo de Drive');
      e.status = 400;
      throw e;
    }
    return { kind: 'file', url: `/api/stream?link=${encodeURIComponent(href)}`, title: 'Google Drive', via: 'drive' };
  }
  if (host.endsWith('dropbox.com')) {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
    return { kind: 'file', url: url.href, title: name, via: 'dropbox' };
  }
  if (/\.m3u8($|\?)/i.test(url.pathname + url.search)) return { kind: 'hls', url: href, title: name };
  return { kind: 'file', url: href, title: name };
}

// ---------- links directos de MediaFire / Drive (se re-resuelven cuando vencen) ----------

const directCache = new Map(); // link -> {url, at}
const CACHE_MS = 20 * 60 * 1000;

async function resolveMediafire(link) {
  const r = await fetch(link, { headers: { 'User-Agent': UA, 'Accept-Language': 'es,en;q=0.8' }, redirect: 'follow' });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return r.url; // ya era directo
  const html = await r.text();
  const m =
    html.match(/href="(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i) ||
    html.match(/"(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i) ||
    html.match(/data-scrambled-url="([^"]+)"/i);
  if (!m) throw Object.assign(new Error('No pude sacar el link de descarga de MediaFire (¿el archivo es público?)'), { status: 502 });
  let u = m[1];
  if (!/^https?:/.test(u)) u = Buffer.from(u, 'base64').toString('utf8');
  return u.replace(/&amp;/g, '&');
}

function resolveDrive(link) {
  const id = driveId(link);
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}

async function direct(link, fresh = false) {
  const c = directCache.get(link);
  if (!fresh && c && Date.now() - c.at < CACHE_MS) return c.url;
  const host = new URL(link).hostname;
  const url = host.endsWith('mediafire.com') ? await resolveMediafire(link) : resolveDrive(link);
  directCache.set(link, { url, at: Date.now() });
  return url;
}

function allowed(link) {
  try {
    const h = new URL(link).hostname;
    return h.endsWith('mediafire.com') || h === 'drive.google.com';
  } catch {
    return false;
  }
}

/** GET /api/stream?link=... — pasa el video con Range (para poder adelantar/atrasar). */
export async function streamLink(req, res, link) {
  if (!allowed(link)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('host no permitido');
    return;
  }
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  const attempt = async (fresh) => {
    const url = await direct(link, fresh);
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
