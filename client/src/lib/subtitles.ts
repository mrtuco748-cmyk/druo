// Conversión de subtítulos .srt / .vtt a WebVTT en el navegador + ajuste de desfase (offset).

export function srtToVtt(raw: string, offsetSec = 0): string {
  const clean = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const shift = (h: string, m: string, s: string, ms: string) => {
    const total = Math.max(0, Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000 + offsetSec);
    const hh = String(Math.floor(total / 3600)).padStart(2, '0');
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(total % 60)).padStart(2, '0');
    const mmm = String(Math.round((total - Math.floor(total)) * 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
  };

  const body = clean
    .replace(/^WEBVTT[^\n]*\n?/i, '')
    .replace(
      /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/g,
      (_, h1, m1, s1, ms1, h2, m2, s2, ms2) => `${shift(h1, m1, s1, ms1)} --> ${shift(h2, m2, s2, ms2)}`
    );

  return `WEBVTT\n\n${body}\n`;
}
