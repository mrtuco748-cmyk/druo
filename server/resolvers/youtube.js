// Extracción y resolución de videos y listas de reproducción de YouTube
import { BROWSER_HEADERS, decodeHtmlEntities, toTranslateProxyUrl } from './common.js';

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
