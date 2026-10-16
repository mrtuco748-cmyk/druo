// Resolución de links pegados por el usuario (Cuevana, YouTube, MediaFire, Google Drive, Dropbox, MP4/HLS directo)
// y streaming con soporte de Range / proxy HLS con CORS para todos los dispositivos.

import { Readable } from 'node:stream';
import crypto from 'node:crypto';
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

// ---------- Cuevana Decryption & Resolver ----------

function decryptAES(b64, keyBuf) {
  const raw = Buffer.from(b64, 'base64');
  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

function unpackDeanEdwards(script) {
  const m = script.match(/}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/s);
  if (!m) return null;
  let p = m[1];
  const a = parseInt(m[2], 10);
  let c = parseInt(m[3], 10);
  const k = m[4].split('|');

  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

const BROWSER_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export async function resolveCuevana(cuevanaUrl) {
  let html1 = '';
  try {
    const r1 = await fetch(cuevanaUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(6000) });
    if (r1.ok) {
      html1 = await r1.text();
    }
  } catch {}

  // Fallback 1: Jina Reader HTML (bypass ultra-rápido para Cloudflare)
  if (!html1 || !html1.includes('/vidurl/')) {
    try {
      const rJina = await fetch(`https://r.jina.ai/${cuevanaUrl}`, {
        headers: { 'X-Return-Format': 'html' },
        signal: AbortSignal.timeout(10000),
      });
      if (rJina.ok) html1 = await rJina.text();
    } catch {}
  }

  // Fallback 2: allorigins
  if (!html1 || !html1.includes('/vidurl/')) {
    try {
      const rProxy = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cuevanaUrl)}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (rProxy.ok) html1 = await rProxy.text();
    } catch {}
  }

  const titleMatch = html1 ? html1.match(/<title>([^<]+)<\/title>/i) : null;
  const title = (titleMatch ? titleMatch[1] : 'Película')
    .replace(' - CuevanaPRO', '')
    .replace('Ver ', '')
    .replace(' Online', '')
    .trim();

  const vidurlMatch = html1 ? html1.match(/<iframe[^>]+src=["'](\/vidurl\/[^"']+)["']/i) : null;
  const vidurl = vidurlMatch ? new URL(vidurlMatch[1], cuevanaUrl).href : null;

  // Si no pudimos obtener vidurl, fallback al link directo embebido
  if (!vidurl) {
    return {
      kind: 'embed',
      url: cuevanaUrl,
      title: title || 'Cuevana',
      via: 'cuevana',
    };
  }

  let html2 = '';
  try {
    const r2 = await fetch(vidurl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: cuevanaUrl,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (r2.ok) html2 = await r2.text();
  } catch {}

  const challengeMatch = html2.match(/const POW_CHALLENGE = '([^']+)';/);
  const difficultyMatch = html2.match(/const POW_DIFFICULTY = (\d+);/);
  const saltMatch = html2.match(/const POW_SALT = '([^']+)';/);
  const dataLinkMatch = html2.match(/let dataLink = (\[[\s\S]*?\]);/);

  // Si no se puede descifrar el reproductor en el servidor, usamos el reproductor vidurl embebido directamente
  if (!challengeMatch || !dataLinkMatch) {
    return {
      kind: 'embed',
      url: vidurl,
      title: `${title} (Cuevana)`,
      via: 'cuevana',
    };
  }

  const challenge = challengeMatch[1];
  const difficulty = parseInt(difficultyMatch ? difficultyMatch[1] : '3', 10);
  const salt = saltMatch ? saltMatch[1] : '';
  const dataLink = JSON.parse(dataLinkMatch[1]);

  // Resolver Proof of Work
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;
  while (true) {
    const hash = crypto.createHash('sha256').update(challenge + nonce).digest('hex');
    if (hash.startsWith(prefix)) break;
    nonce++;
  }
  const keyHash = crypto.createHash('sha256').update(challenge + nonce + salt).digest();

  // Decodificar enlaces de servidores
  const candidateEmbeds = [];
  for (const file of dataLink) {
    const lang = file.video_language || 'SUB';
    for (const embed of file.sortedEmbeds || []) {
      try {
        const decryptedUrl = decryptAES(embed.link, keyHash);
        if (decryptedUrl && /^https?:/.test(decryptedUrl)) {
          candidateEmbeds.push({
            server: embed.servername,
            url: decryptedUrl,
            lang,
          });
        }
      } catch {}
    }
  }

  // Priorizar servidores que dan streams HLS limpios (vidhide, streamwish)
  candidateEmbeds.sort((a, b) => {
    if (a.server === 'vidhide') return -1;
    if (b.server === 'vidhide') return 1;
    return 0;
  });

  for (const cand of candidateEmbeds) {
    try {
      let embedHtml = '';
      try {
        const rEmbed = await fetch(cand.url, {
          headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (rEmbed.ok) embedHtml = await rEmbed.text();
      } catch {}

      // Fallback si direct timeout: proxy allorigins
      if (!embedHtml || !embedHtml.includes('eval(')) {
        try {
          const rProxy = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cand.url)}`, {
            signal: AbortSignal.timeout(6000),
          });
          if (rProxy.ok) embedHtml = await rProxy.text();
        } catch {}
      }

      if (!embedHtml) continue;

      const scripts = [...embedHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      for (const s of scripts) {
        if (!s.includes('eval(function(p,a,c,k,e,d)')) continue;
        const unpacked = unpackDeanEdwards(s);
        if (!unpacked) continue;

        let hlsUrl = null;
        const linksObjMatch = unpacked.match(/var links\s*=\s*(\{[\s\S]*?\});/);
        if (linksObjMatch) {
          try {
            const links = JSON.parse(linksObjMatch[1]);
            // Priorizar hls3 (master.txt que no tiene padding) o hls2/hls4
            hlsUrl = links.hls3 || links.hls2 || links.hls4;
            if (hlsUrl && hlsUrl.startsWith('/')) {
              hlsUrl = new URL(hlsUrl, cand.url).href;
            }
          } catch {}
        }

        if (!hlsUrl) {
          const m3u8Match = unpacked.match(/https?:[^\s"'<>]+\.(?:m3u8|txt)[^\s"'<>?]*(?:\?[^\s"'<>]*)?/i);
          if (m3u8Match) hlsUrl = m3u8Match[0];
        }

        if (hlsUrl) {
          return {
            kind: 'hls',
            url: `/api/hls-proxy?url=${encodeURIComponent(hlsUrl)}&ref=${encodeURIComponent(cand.url)}`,
            title: `${title} (${cand.lang.toUpperCase()})`,
            via: 'cuevana',
          };
        }
      }
    } catch (err) {
      // Intentar con el siguiente servidor candidato
    }
  }

  // Fallback si ningún servidor extrajo HLS directo: reproducir el reproductor descifrado (no vidurl que falla en mobile por blob worker)
  const fallbackEmbed = candidateEmbeds[0]?.url || vidurl;
  return {
    kind: 'embed',
    url: fallbackEmbed,
    title: `${title} (Cuevana)`,
    via: 'cuevana',
  };
}

// ---------- HLS Playlist Rewriting & Proxy ----------

function rewritePlaylist(m3u8Text, baseUrl, referer) {
  const lines = m3u8Text.split('\n');
  const out = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Reescribir atributos URI="..." en etiquetas (#EXT-X-KEY o #EXT-X-I-FRAME-STREAM-INF)
      line = line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const full = new URL(uri, baseUrl).href;
        return `URI="/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}"`;
      });
      out.push(line);
    } else {
      // Es una URL de sub-playlist o segmento (.m3u8 / .ts / .woff2 / .image)
      const full = new URL(trimmed, baseUrl).href;
      out.push(`/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}`);
    }
  }

  return out.join('\n');
}

/** Proxy de HLS con CORS universal y descifrado de padding/PNG para cualquier navegador */
export async function proxyHls(req, res, targetUrl, referer = '') {
  if (!targetUrl || !/^https?:/.test(targetUrl)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('URL inválida');
    return;
  }

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    const headers = { 'User-Agent': UA };
    if (referer) headers.Referer = referer;
    if (req.headers.range) headers.Range = req.headers.range;

    const up = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
      signal: ac.signal,
    });

    if (!up.ok && up.status !== 206) {
      res.writeHead(up.status, { 'Content-Type': 'text/plain' }).end(`Error upstream: ${up.status}`);
      return;
    }

    const ct = (up.headers.get('content-type') || '').toLowerCase();
    const isPlaylist =
      ct.includes('mpegurl') ||
      ct.includes('application/x-mpegurl') ||
      targetUrl.includes('.m3u8') ||
      targetUrl.includes('master.txt') ||
      (targetUrl.includes('index-') && targetUrl.endsWith('.txt'));

    if (isPlaylist) {
      const text = await up.text();
      if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
        const rewritten = rewritePlaylist(text, targetUrl, referer);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-cache',
        });
        res.end(rewritten);
        return;
      }
    }

    // Segmento binario de video
    const outHeaders = {
      'Content-Type': 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    };

    const cr = up.headers.get('content-range');
    if (cr) outHeaders['Content-Range'] = cr;

    const buf = Buffer.from(await up.arrayBuffer());
    let payload = buf;
    // Si el host disfrazó el segmento TS con cabecera PNG falsa, removerla
    if (buf.length > 70 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const iendIdx = buf.indexOf(Buffer.from('IEND'));
      if (iendIdx !== -1) {
        payload = buf.subarray(iendIdx + 8);
      }
    }

    outHeaders['Content-Length'] = payload.length;
    res.writeHead(up.status === 206 ? 206 : 200, outHeaders);
    res.end(payload);
  } catch (err) {
    if (ac.signal.aborted) return;
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end(err.message || 'Error proxying HLS');
  }
}

// ---------- Clasificador de links ----------

/** Clasifica un link. Devuelve la fuente que se comparte con la sala. */
export async function classify(raw) {
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

  // Soporte nativo para Cuevana (cuevanapro.org / cuevana.pro / etc.)
  if (host.includes('cuevanapro') || host.includes('cuevana')) {
    return await resolveCuevana(href);
  }

  if (host.endsWith('mediafire.com')) {
    return { kind: 'file', url: `/api/stream?link=${encodeURIComponent(href)}`, title: name, via: 'mediafire' };
  }
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
  if (/\.m3u8($|\?)/i.test(url.pathname + url.search)) {
    return {
      kind: 'hls',
      url: `/api/hls-proxy?url=${encodeURIComponent(href)}`,
      title: name,
    };
  }
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
