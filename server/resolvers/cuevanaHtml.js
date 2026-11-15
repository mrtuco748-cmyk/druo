// Descarga y extracción de HTML y reproductor para Cuevana
import { BROWSER_HEADERS, decodeHtmlEntities, toTranslateProxyUrl } from './common.js';

export async function fetchCuevanaHtml(targetUrl, checkFn, referer = '') {
  try {
    const headers = { ...BROWSER_HEADERS };
    if (referer) headers.Referer = referer;
    const r1 = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(4000) });
    if (r1.ok) {
      const t = await r1.text();
      if (checkFn(t)) return t;
    }
  } catch {}

  const gUrl = toTranslateProxyUrl(targetUrl);
  if (gUrl) {
    try {
      const rG = await fetch(gUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
      if (rG.ok) {
        const t = await rG.text();
        if (checkFn(t)) return t;
      }
    } catch {}
  }

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

export async function extractVidUrlAndTitle(cuevanaUrl) {
  let currentUrl = cuevanaUrl;
  let html1 = await fetchCuevanaHtml(
    currentUrl,
    (t) => t.includes('/vidurl/') || t.includes('/temporada/') || t.includes('/pelicula/')
  );

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

  return { vidurl, title, currentUrl };
}
