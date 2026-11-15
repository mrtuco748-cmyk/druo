// Clasificador de URLs pegadas por el usuario
import { driveId } from './cloud.js';
import { resolveCuevana } from './cuevana.js';
import { resolveYoutubePlaylist, youtubeId, youtubePlaylistId } from './youtube.js';

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
