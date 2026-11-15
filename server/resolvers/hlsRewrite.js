// Reescritura de playlists HLS (.m3u8) para enrutar segmentos por el proxy local
export function rewritePlaylist(m3u8Text, baseUrl, referer) {
  const lines = m3u8Text.split('\n');
  const out = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Reescribir atributos URI="..." en etiquetas (#EXT-X-KEY, #EXT-X-MAP, etc.)
      line = line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const full = new URL(uri, baseUrl).href;
        return `URI="/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}"`;
      });
      out.push(line);
    } else {
      // URL de sub-playlist o segmento
      const full = new URL(trimmed, baseUrl).href;
      out.push(`/api/hls-proxy?url=${encodeURIComponent(full)}&ref=${encodeURIComponent(referer)}`);
    }
  }

  return out.join('\n');
}
