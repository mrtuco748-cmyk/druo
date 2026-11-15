// Orquestador principal de resolución de Cuevana
import { BROWSER_HEADERS, UA, toTranslateProxyUrl } from './common.js';
import { solvePow, unpackDeanEdwards } from './cuevanaCrypto.js';
import { findWorkingHls, parseAndRankEmbeds } from './cuevanaEmbed.js';
import { extractVidUrlAndTitle, fetchCuevanaHtml } from './cuevanaHtml.js';

export async function resolveCuevana(cuevanaUrl) {
  const { vidurl, title, currentUrl } = await extractVidUrlAndTitle(cuevanaUrl);
  if (!vidurl) {
    const e = new Error('No encontré el reproductor en ese link de Cuevana. Pegá el link de una película o capítulo.');
    e.status = 404;
    throw e;
  }

  let html2 = await fetchCuevanaHtml(vidurl, (t) => t.includes('POW_CHALLENGE') && t.includes('dataLink'), currentUrl);
  if (!html2) {
    const imdbMatch = vidurl.match(/\/vidurl\/([^/?#]+)/i);
    if (imdbMatch) {
      html2 = await fetchCuevanaHtml(
        `https://embed69.org/f/${imdbMatch[1]}/`,
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

  const keyHash = solvePow(
    challengeMatch[1],
    parseInt(difficultyMatch ? difficultyMatch[1] : '3', 10),
    saltMatch ? saltMatch[1] : ''
  );
  const candidateEmbeds = parseAndRankEmbeds(JSON.parse(dataLinkMatch[1]), keyHash);

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

  const e = new Error('No se encontraron servidores disponibles para esa película en Cuevana');
  e.status = 502;
  throw e;
}
