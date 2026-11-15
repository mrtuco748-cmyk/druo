import { renderStrokeOnCtx } from './strokeRenderer';
import { resolveBgColor, StudioBg, StudioPoint, StudioStroke, WORLD_H, WORLD_W } from './types';

function computeSheetBox(vw: number, vh: number) {
  const pad = vw < 600 ? 8 : 24;
  const scaleFit = Math.min((vw - pad) / WORLD_W, (vh - pad) / WORLD_H);
  const sheetW = WORLD_W * scaleFit, sheetH = WORLD_H * scaleFit;
  return { sheetW, sheetH, baseX: (vw - sheetW) / 2, baseY: (vh - sheetH) / 2 };
}

export function renderViewportToCanvas(
  vc: HTMLCanvasElement | null,
  wc: HTMLCanvasElement | null,
  pan: { x: number; y: number },
  zoom: number,
  currentBg: StudioBg,
  remoteLive: StudioStroke | null,
  currentStroke: StudioStroke | null
) {
  if (!vc || !wc) return;
  const ctx = vc.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const vw = vc.width / dpr, vh = vc.height / dpr;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#160b14';
  ctx.fillRect(0, 0, vw, vh);

  const { sheetW, sheetH, baseX, baseY } = computeSheetBox(vw, vh);

  ctx.translate(vw / 2 + pan.x, vh / 2 + pan.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-vw / 2, -vh / 2);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fillStyle = resolveBgColor(currentBg);
  ctx.beginPath(); ctx.roundRect(baseX, baseY, sheetW, sheetH, 14); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.roundRect(baseX, baseY, sheetW, sheetH, 14); ctx.clip();
  ctx.drawImage(wc, baseX, baseY, sheetW, sheetH);

  if (remoteLive || currentStroke) {
    ctx.translate(baseX, baseY);
    if (remoteLive) renderStrokeOnCtx(ctx, remoteLive, sheetW, sheetH, currentBg);
    if (currentStroke) renderStrokeOnCtx(ctx, currentStroke, sheetW, sheetH, currentBg);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 158, 187, 0.55)';
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath(); ctx.roundRect(baseX, baseY, sheetW, sheetH, 14); ctx.stroke();
  ctx.restore();
}

export function clientToWorldNorm(
  vc: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
  pan: { x: number; y: number },
  zoom: number
): StudioPoint {
  if (!vc) return { x: 0.5, y: 0.5 };
  const rect = vc.getBoundingClientRect();
  const vw = rect.width, vh = rect.height;
  const ux = (clientX - rect.left - vw / 2 - pan.x) / zoom + vw / 2;
  const uy = (clientY - rect.top - vh / 2 - pan.y) / zoom + vh / 2;
  const { sheetW, sheetH, baseX, baseY } = computeSheetBox(vw, vh);
  return {
    x: Math.max(0, Math.min(1, Number(((ux - baseX) / sheetW).toFixed(4)))),
    y: Math.max(0, Math.min(1, Number(((uy - baseY) / sheetH).toFixed(4)))),
  };
}

export function worldNormToScreenPct(
  vc: HTMLCanvasElement | null,
  wx: number,
  wy: number,
  pan: { x: number; y: number },
  zoom: number
) {
  if (!vc) return { left: '50%', top: '50%' };
  const rect = vc.getBoundingClientRect();
  const vw = rect.width || 1, vh = rect.height || 1;
  const { sheetW, sheetH, baseX, baseY } = computeSheetBox(vw, vh);
  const sx = (baseX + wx * sheetW - vw / 2) * zoom + vw / 2 + pan.x;
  const sy = (baseY + wy * sheetH - vh / 2) * zoom + vh / 2 + pan.y;
  return { left: `${(sx / vw) * 100}%`, top: `${(sy / vh) * 100}%` };
}
