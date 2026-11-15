import { DrawStroke } from './types';

export function redrawCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: DrawStroke[],
  local: DrawStroke | null,
  remote: DrawStroke | null
) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawSingle = (s: DrawStroke) => {
    if (!s.points || !s.points.length) return;
    ctx.beginPath();
    ctx.strokeStyle = s.color || '#ffcf6b';
    const scale = Math.min(canvas.width, canvas.height) / 450;
    ctx.lineWidth = Math.max(2.5, (s.width || 3.5) * Math.max(0.6, scale));

    const p0 = s.points[0];
    const startX = p0.x * canvas.width;
    const startY = p0.y * canvas.height;
    ctx.moveTo(startX, startY);

    if (s.points.length === 1) {
      ctx.lineTo(startX + 0.1, startY + 0.1);
    } else {
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }
    }
    ctx.stroke();
  };

  strokes.forEach(drawSingle);
  if (local) drawSingle(local);
  if (remote) drawSingle(remote);
}
