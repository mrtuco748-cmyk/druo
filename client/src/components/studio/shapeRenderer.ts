import { StudioStroke } from './types';

export function renderShapeStroke(
  ctx: CanvasRenderingContext2D,
  s: StudioStroke,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  if (s.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    return true;
  }
  if (s.tool === 'rect') {
    ctx.beginPath();
    ctx.roundRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), 6);
    if (s.filled) ctx.fill();
    ctx.stroke();
    return true;
  }
  if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(2, Math.abs(x1 - x0) / 2), Math.max(2, Math.abs(y1 - y0) / 2), 0, 0, Math.PI * 2);
    if (s.filled) ctx.fill();
    ctx.stroke();
    return true;
  }
  if (s.tool === 'heart') {
    const cx = (x0 + x1) / 2, topY = Math.min(y0, y1);
    const rw = Math.max(8, Math.abs(x1 - x0)), rh = Math.max(8, Math.abs(y1 - y0)), dY = rh * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, topY + dY);
    ctx.bezierCurveTo(cx, topY, cx - rw / 2, topY, cx - rw / 2, topY + dY);
    ctx.bezierCurveTo(cx - rw / 2, topY + (rh + dY) / 2, cx, topY + (rh + dY) / 1.45, cx, topY + rh);
    ctx.bezierCurveTo(cx, topY + (rh + dY) / 1.45, cx + rw / 2, topY + (rh + dY) / 2, cx + rw / 2, topY + dY);
    ctx.bezierCurveTo(cx + rw / 2, topY, cx, topY, cx, topY + dY);
    ctx.closePath();
    if (s.filled) ctx.fill();
    ctx.stroke();
    return true;
  }
  if (s.tool === 'star') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const outerR = Math.max(6, Math.hypot(x1 - x0, y1 - y0) / 2), innerR = outerR * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR, angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (s.filled) ctx.fill();
    ctx.stroke();
    return true;
  }
  return false;
}
