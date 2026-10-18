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

export function youtubePlaylistId(url) {
  const m = String(url).match(/(?:youtube\.com|youtu\.be)\/.*[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function toTranslateProxyUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    const host = u.hostname.replace(/\./g, '-');
    const sep = u.search ? '&' : '?';
    return `https://${host}.translate.goog${u.pathname}${u.search}${sep}_x_tr_sl=auto&_x_tr_tl=es&_x_tr_hl=es&_x_tr_pto=wapp`;
  } catch {
    return null;
  }
}

export async function resolveYoutubePlaylist(listId, initialVideoId = null) {
  const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`;
  let html = '';
  try {
    const r = await fetch(playlistUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) html = await r.text();
  } catch {}

  if (!html || !html.includes('"videoId"')) {
    const proxyUrl = toTranslateProxyUrl(playlistUrl);
    if (proxyUrl) {
      try {
        const r2 = await fetch(proxyUrl, {
          headers: BROWSER_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (r2.ok) html = await r2.text();
      } catch {}
    }
  }

  // Extraer IDs de playlistVideoRenderer primero para evitar videos recomendados fuera de la lista
  let ids = [
    ...new Set(
      [...html.matchAll(/"playlistVideoRenderer":\s*\{[\s\S]{0,120}?"videoId":"([A-Za-z0-9_-]{11})"/g)].map(
        (m) => m[1]
      )
    ),
  ];
  if (ids.length === 0) {
    ids = [...new Set([...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map((m) => m[1]))];
  }

  if (ids.length === 0 && initialVideoId) {
    return { kind: 'youtube', id: initialVideoId, listId, title: 'YouTube' };
  }
  if (ids.length === 0) {
    const e = new Error('No se encontraron videos públicos en esa playlist de YouTube');
    e.status = 404;
    throw e;
  }

  const titleMatch =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/<title>([^<]+)<\/title>/i);
  const rawTitle = decodeHtmlEntities(titleMatch ? titleMatch[1] : 'Playlist de YouTube')
    .replace(/\s*-\s*YouTube$/i, '')
    .trim();

  const startIdx = initialVideoId ? Math.max(0, ids.indexOf(initialVideoId)) : 0;

  return {
    kind: 'youtube',
    id: ids[startIdx] || ids[0],
    listId,
    playlist: ids,
    playlistIndex: startIdx,
    title: rawTitle || 'Playlist de YouTube',
  };
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

async function fetchCuevanaHtml(targetUrl, checkFn, referer = '') {
  // 1. Intento directo rápido (funciona en IP residencial)
  try {
    const headers = { ...BROWSER_HEADERS };
    if (referer) headers.Referer = referer;
    const r1 = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(4000) });
    if (r1.ok) {
      const t = await r1.text();
      if (checkFn(t)) return t;
    }
  } catch {}

  // 2. Bypass ultra-rápido por Google Translate Proxy (evita bloqueo ASN 1005 de Cloudflare en Render)
  const gUrl = toTranslateProxyUrl(targetUrl);
  if (gUrl) {
    try {
      const rG = await fetch(gUrl, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (rG.ok) {
        const t = await rG.text();
        if (checkFn(t)) return t;
      }
    } catch {}
  }

  // 3. Fallback Jina Reader HTML
  try {
    const rJina = await fetch(`https://r.jina.ai/${targetUrl}`, {
      headers: { 'X-Return-Format': 'html' },
      signal: AbortSignal.timeout(9000),
    });
    if (rJina.ok) {
      const t = await rJina.text();
      if (checkFn(t)) return t;
    }
  } catch {}

  return '';
}

export async function resolveCuevana(cuevanaUrl) {
  let currentUrl = cuevanaUrl;
  let html1 = await fetchCuevanaHtml(
    currentUrl,
    (t) => t.includes('/vidurl/') || t.includes('/temporada/') || t.includes('/pelicula/')
  );

  // Si el usuario pegó la portada de una serie (/serie/nombre) o una búsqueda (/search?s=...), abrir el primer episodio o resultado
  if (html1 && !html1.includes('/vidurl/')) {
    const epMatch =
      html1.match(/href=["']([^"']*\/serie\/[^"']+\/temporada\/\d+\/capitulo\/\d+)["']/i) ||
      html1.match(/href=["'](https?:\/\/[^"']*cuevanapro\.org\/pelicula\/[^"'?_]+)["']/i) ||
      html1.match(/href=["'](\/pelicula\/[^"'?_]+)["']/i);
    if (epMatch) {
      const nextUrl = new URL(decodeHtmlEntities(epMatch[1]).split('?')[0], cuevanaUrl).href;
      currentUrl = nextUrl;
      html1 = await fetchCuevanaHtml(currentUrl, (t) => t.includes('/vidurl/'), cuevanaUrl);
    }
  }

  const titleMatch = html1 ? html1.match(/<title>([^<]+)<\/title>/i) : null;
  const title = decodeHtmlEntities(titleMatch ? titleMatch[1] : 'Película')
    .replace(/\s*-\s*CuevanaPRO.*$/i, '')
    .replace(/^Ver\s+/i, '')
    .replace(/\s+Online.*$/i, '')
    .trim();

  const vidurlMatch = html1
    ? html1.match(/<iframe[^>]+src=["']([^"']*\/vidurl\/[^"']+)["']/i) ||
      html1.match(/(\/vidurl\/[A-Za-z0-9_-]+\/?)/i)
    : null;
  let vidurl = null;
  if (vidurlMatch) {
    const rawVid = decodeHtmlEntities(vidurlMatch[1]).split('?')[0];
    const vidPath = rawVid.startsWith('http') ? new URL(rawVid).pathname : rawVid;
    vidurl = new URL(vidPath, cuevanaUrl).href;
  }

  if (!vidurl) {
    const e = new Error(
      'No encontré el reproductor en ese link de Cuevana. Asegurate de pegar el link directo de una película o capítulo.'
    );
    e.status = 404;
    throw e;
  }

  // Obtener HTML del reproductor vidurl (o su espejo directo en embed69.org)
  let html2 = await fetchCuevanaHtml(
    vidurl,
    (t) => t.includes('POW_CHALLENGE') && t.includes('dataLink'),
    currentUrl
  );

  if (!html2) {
    const imdbMatch = vidurl.match(/\/vidurl\/([^/?#]+)/i);
    if (imdbMatch) {
      const embed69Url = `https://embed69.org/f/${imdbMatch[1]}/`;
      html2 = await fetchCuevanaHtml(
        embed69Url,
        (t) => t.includes('POW_CHALLENGE') && t.includes('dataLink'),
        currentUrl
      );
    }
  }

  const challengeMatch = html2.match(/const POW_CHALLENGE = '([^']+)';/);
  const difficultyMatch = html2.match(/const POW_DIFFICULTY = (\d+);/);
  const saltMatch = html2.match(/const POW_SALT = '([^']+)';/);
  const dataLinkMatch = html2.match(/let dataLink = (\[[\s\S]*?\]);/);

  if (!challengeMatch || !dataLinkMatch) {
    const e = new Error('No se pudo descifrar el reproductor de Cuevana en este momento. Probá de nuevo en unos segundos.');
    e.status = 502;
    throw e;
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
    const lang = (file.video_language || 'SUB').toUpperCase();
    for (const embed of file.sortedEmbeds || []) {
      try {
        const decryptedUrl = decryptAES(embed.link, keyHash);
        if (decryptedUrl && /^https?:/.test(decryptedUrl)) {
          candidateEmbeds.push({
            server: String(embed.servername || '').toLowerCase(),
            url: decryptedUrl.replace(/`/g, '').trim(),
            lang,
          });
        }
      } catch {}
    }
  }

  const serverRank = (s) => (s === 'vidhide' ? 0 : s === 'streamwish' ? 1 : 2);
  const langRank = (l) => (l === 'LAT' ? 0 : l === 'ESP' ? 1 : l === 'SUB' ? 2 : 3);

  // Priorizar servidores HLS directos (vidhide) y audio Latino (LAT > ESP > SUB)
  candidateEmbeds.sort((a, b) => {
    const sr = serverRank(a.server) - serverRank(b.server);
    if (sr !== 0) return sr;
    return langRank(a.lang) - langRank(b.lang);
  });

  for (const cand of candidateEmbeds) {
    try {
      let embedHtml = '';
      try {
        const rEmbed = await fetch(cand.url, {
          headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Referer: vidurl,
          },
          signal: AbortSignal.timeout(6500),
        });
        if (rEmbed.ok) embedHtml = await rEmbed.text();
      } catch {}

      if (!embedHtml || !embedHtml.includes('eval(')) {
        const gEmbed = toTranslateProxyUrl(cand.url);
        if (gEmbed) {
          try {
            const rG = await fetch(gEmbed, {
              headers: BROWSER_HEADERS,
              signal: AbortSignal.timeout(6500),
            });
            if (rG.ok) embedHtml = await rG.text();
          } catch {}
        }
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
            // Priorizar hls3 (master.txt universal sin restricción de ASN) o hls2/hls4
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
            title: `${title} (${cand.lang})`,
            via: 'cuevana',
          };
        }
      }
    } catch {
      // Intentar con el siguiente servidor candidato
    }
  }

  // Fallback solo a un embed que permita iframe cross-origin (nunca cuevanapro.org que tiene X-Frame-Options: SAMEORIGIN)
  const safeEmbed = candidateEmbeds.find((c) => c.server === 'vidhide' || c.server === 'streamwish') || candidateEmbeds[0];
  if (safeEmbed) {
    return {
      kind: 'embed',
      url: safeEmbed.url,
      title: `${title} (${safeEmbed.lang})`,
      via: 'cuevana',
    };
  }

  const e = new Error('No se encontraron servidores disponibles para esa película en Cuevana');
  e.status = 502;
  throw e;
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
      // Reescribir atributos URI="..." en etiquetas (#EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, #EXT-X-I-FRAME-STREAM-INF)
      line = line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const full = new URL(uri, baseUrl).href;
        return `URI="/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}"`;
      });
      out.push(line);
    } else {
      // Es una URL de sub-playlist o segmento (.m3u8 / .ts / .woff2 / .image / .txt)
      const full = new URL(trimmed, baseUrl).href;
      out.push(`/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}`);
    }
  }

  return out.join('\n');
}

/** Proxy de HLS con CORS universal y descifrado de padding/PNG para cualquier navegador (PC y Celular) */
export async function proxyHls(req, res, targetUrl, referer = '') {
  if (!targetUrl || !/^https?:/.test(targetUrl)) {
    res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }).end('URL inválida');
    return;
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
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
      res
        .writeHead(up.status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        .end(`Error upstream: ${up.status}`);
      return;
    }

    const buf = Buffer.from(await up.arrayBuffer());
    const headAscii = buf.subarray(0, 160).toString('utf8').trimStart();
    const isPlaylist = headAscii.startsWith('#EXTM3U') || headAscii.includes('#EXTINF');

    if (isPlaylist) {
      const text = buf.toString('utf8');
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

    // Segmento binario de video (.ts / .m4s)
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
      res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
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
  const ytList = youtubePlaylistId(href);
  const yt = youtubeId(href);
  if (ytList) {
    return await resolveYoutubePlaylist(ytList, yt);
  }
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
