// Extracción y validación de servidores candidatos y streams HLS de Cuevana
import { UA } from './common.js';
import { decryptAES } from './cuevanaCrypto.js';

const serverRank = (s) => (s === 'vidhide' ? 0 : s === 'streamwish' ? 1 : 2);
const langRank = (l) => (l === 'LAT' ? 0 : l === 'ESP' ? 1 : l === 'SUB' ? 2 : 3);

export function parseAndRankEmbeds(dataLink, keyHash) {
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

  candidateEmbeds.sort((a, b) => {
    const sr = serverRank(a.server) - serverRank(b.server);
    if (sr !== 0) return sr;
    return langRank(a.lang) - langRank(b.lang);
  });

  return candidateEmbeds;
}

export async function findWorkingHls(unpacked, candUrl) {
  let hlsUrl = null;
  const linksObjMatch = unpacked.match(/var links\s*=\s*(\{[\s\S]*?\});/);
  if (linksObjMatch) {
    try {
      const links = JSON.parse(linksObjMatch[1]);
      const rawCandidates = [links.hls4, links.hls3, links.hls2, links.hls]
        .filter(Boolean)
        .map((u) => (u.startsWith('/') ? new URL(u, candUrl).href : u));

      for (const candHls of rawCandidates) {
        try {
          const check = await fetch(candHls, {
            headers: { 'User-Agent': UA, Referer: candUrl },
            signal: AbortSignal.timeout(2500),
          });
          if (check.ok) {
            hlsUrl = candHls;
            break;
          }
        } catch {}
      }
    } catch {}
  }

  if (!hlsUrl) {
    const m3u8Match = unpacked.match(/https?:[^\s"'<>]+\.(?:m3u8|txt)[^\s"'<>?]*(?:\?[^\s"'<>]*)?/i);
    if (m3u8Match) {
      const testUrl = m3u8Match[0].startsWith('/') ? new URL(m3u8Match[0], candUrl).href : m3u8Match[0];
      try {
        const check = await fetch(testUrl, {
          headers: { 'User-Agent': UA, Referer: candUrl },
          signal: AbortSignal.timeout(2500),
        });
        if (check.ok) hlsUrl = testUrl;
      } catch {}
    }
  }

  return hlsUrl;
}
