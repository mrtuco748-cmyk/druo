import { floodFillCanvas } from './floodFill';
import { renderShapeStroke } from './shapeRenderer';
import { resolveBgColor, StudioBg, StudioStroke, WORLD_H, WORLD_W } from './types';

export function drawWorldBackground(ctx: CanvasRenderingContext2D, mode: StudioBg) {
  ctx.save();
  ctx.fillStyle = resolveBgColor(mode);
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  if (mode === 'grid' || mode === 'gridLight') {
    ctx.strokeStyle = mode === 'gridLight' ? 'rgba(224, 83, 124, 0.16)' : 'rgba(255, 145, 185, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 32; x < WORLD_W; x += 32) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); }
    for (let y = 32; y < WORLD_H; y += 32) { ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); }
    ctx.stroke();
  } else if (mode === 'dots') {
    ctx.fillStyle = 'rgba(224, 83, 124, 0.28)';
    for (let x = 28; x < WORLD_W; x += 28) {
      for (let y = 28; y < WORLD_H; y += 28) {
        ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function renderStrokeOnCtx(
  ctx: CanvasRenderingContext2D,
  s: StudioStroke,
  w: number,
  h: number,
  currentBg: StudioBg
) {
  if (!s.points || s.points.length === 0) return;
  if (s.tool === 'bucket') { floodFillCanvas(ctx, s.points[0].x, s.points[0].y, s.color); return; }

  ctx.save();
  const scale = w / 1000;
  const strokePx = Math.max(1.5, s.size * scale);
  const strokeColor = s.tool === 'eraser' ? resolveBgColor(currentBg) : s.color;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = strokePx; ctx.strokeStyle = strokeColor; ctx.fillStyle = strokeColor;
  ctx.globalAlpha = s.tool === 'marker' ? 0.42 : s.tool === 'airbrush' ? 0.28 : 1;

  if (s.tool === 'neon') { ctx.shadowColor = s.color; ctx.shadowBlur = strokePx * 2.2; }
  else if (s.tool === 'airbrush') { ctx.shadowColor = s.color; ctx.shadowBlur = strokePx * 1.8; }

  const p0 = s.points[0], pLast = s.points[s.points.length - 1];
  const x0 = p0.x * w, y0 = p0.y * h, x1 = pLast.x * w, y1 = pLast.y * h;

  if (renderShapeStroke(ctx, s, x0, y0, x1, y1)) { ctx.restore(); return; }

  ctx.beginPath();
  if (s.points.length === 1) {
    ctx.arc(x0, y0, strokePx / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(x0, y0);
    for (let i = 1; i < s.points.length - 1; i++) {
      const curr = s.points[i], next = s.points[i + 1];
      ctx.quadraticCurveTo(curr.x * w, curr.y * h, ((curr.x + next.x) / 2) * w, ((curr.y + next.y) / 2) * h);
    }
    ctx.lineTo(x1, y1);
    ctx.stroke();

    if (s.tool === 'neon') {
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, strokePx * 0.36); ctx.stroke();
    }
  }
  ctx.restore();
}
