// Enlaces de descarga directa de MediaFire y Google Drive
import { UA } from './common.js';

export function driveId(url) {
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

const directCache = new Map();
const CACHE_MS = 20 * 60 * 1000;

export async function resolveMediafire(link) {
  const r = await fetch(link, { headers: { 'User-Agent': UA, 'Accept-Language': 'es,en;q=0.8' }, redirect: 'follow' });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return r.url;
  const html = await r.text();
  const m =
    html.match(/href="(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i) ||
    html.match(/"(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i) ||
    html.match(/data-scrambled-url="([^"]+)"/i);
  if (!m) {
    throw Object.assign(new Error('No pude sacar el link de descarga de MediaFire (¿el archivo es público?)'), {
      status: 502,
    });
  }
  let u = m[1];
  if (!/^https?:/.test(u)) u = Buffer.from(u, 'base64').toString('utf8');
  return u.replace(/&amp;/g, '&');
}

export function resolveDrive(link) {
  const id = driveId(link);
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}

export async function getDirectUrl(link, fresh = false) {
  const c = directCache.get(link);
  if (!fresh && c && Date.now() - c.at < CACHE_MS) return c.url;
  const host = new URL(link).hostname;
  const url = host.endsWith('mediafire.com') ? await resolveMediafire(link) : resolveDrive(link);
  directCache.set(link, { url, at: Date.now() });
  return url;
}

export function isAllowedHost(link) {
  try {
    const h = new URL(link).hostname;
    return h.endsWith('mediafire.com') || h === 'drive.google.com';
  } catch {
    return false;
  }
}
