// Orquestador principal de resolución de Cuevana
import { BROWSER_HEADERS, UA, toTranslateProxyUrl } from './common.js';
import { deriveLinkKey, solvePow, unpackDeanEdwards } from './cuevanaCrypto.js';
import { findWorkingHls, parseAndRankEmbeds } from './cuevanaEmbed.js';
import { extractVidUrlAndTitle, fetchCuevanaHtml } from './cuevanaHtml.js';

export async function resolveCuevana(cuevanaUrl) {
  const { vidurl, title, currentUrl } = await extractVidUrlAndTitle(cuevanaUrl);
  if (!vidurl) {
    const e = new Error('No encontré el reproductor en ese link de Cuevana. Pegá el link de una película o capítulo.');
    e.status = 404;
    throw e;
  }

  const checkFn = (t) => t.includes('dataLink');
  let html2 = await fetchCuevanaHtml(vidurl, checkFn, currentUrl);
  if (!html2) {
    const imdbMatch = vidurl.match(/\/vidurl\/([^/?#]+)/i);
    if (imdbMatch) {
      html2 = await fetchCuevanaHtml(`https://embed69.org/f/${imdbMatch[1]}/`, checkFn, currentUrl);
    }
  }

  const linkC = html2?.match(/const LINK_CHALLENGE = '([^']+)';/)?.[1];
  const linkS = html2?.match(/const LINK_SALT = '([^']+)';/)?.[1];
  const powC = html2?.match(/const POW_CHALLENGE = '([^']+)';/)?.[1];
  const powD = html2?.match(/const POW_DIFFICULTY = (\d+);/)?.[1];
  const powS = html2?.match(/const POW_SALT = '([^']+)';/)?.[1];
  const dataLinkMatch = html2?.match(/let dataLink = (\[[\s\S]*?\]);/);

  let keyHash = null;
  if (linkC && linkS) {
    keyHash = deriveLinkKey(linkC, linkS);
  } else if (powC) {
    keyHash = solvePow(powC, parseInt(powD || '3', 10), powS || '');
  }

  if (!keyHash || !dataLinkMatch) {
    return { kind: 'embed', url: vidurl, title, via: 'cuevana' };
  }

  let candidateEmbeds = [];
  try {
    candidateEmbeds = parseAndRankEmbeds(JSON.parse(dataLinkMatch[1]), keyHash);
  } catch {}

  for (const cand of candidateEmbeds) {
    try {
      let embedHtml = '';
      try {
        const rEmbed = await fetch(cand.url, {
          headers: { 'User-Agent': UA, Accept: 'text/html,*/*', Referer: vidurl },
          signal: AbortSignal.timeout(6500),
        });
        if (rEmbed.ok) embedHtml = await rEmbed.text();
      } catch {}

      if (!embedHtml || !embedHtml.includes('eval(')) {
        const gEmbed = toTranslateProxyUrl(cand.url);
        if (gEmbed) {
          try {
            const rG = await fetch(gEmbed, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(6500) });
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

        const hlsUrl = await findWorkingHls(unpacked, cand.url);
        if (hlsUrl) {
          return {
            kind: 'hls',
            url: `/api/hls-proxy?url=${encodeURIComponent(hlsUrl)}&ref=${encodeURIComponent(cand.url)}`,
            title: `${title} (${cand.lang})`,
            via: 'cuevana',
          };
        }
      }
    } catch {}
  }

  const safeEmbed = candidateEmbeds.find((c) => c.server === 'vidhide' || c.server === 'streamwish') || candidateEmbeds[0];
  if (safeEmbed) {
    return { kind: 'embed', url: safeEmbed.url, title: `${title} (${safeEmbed.lang})`, via: 'cuevana' };
  }

  return { kind: 'embed', url: vidurl, title, via: 'cuevana' };
}
