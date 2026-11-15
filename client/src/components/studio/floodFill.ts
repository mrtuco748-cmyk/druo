function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(expanded, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  normX: number,
  normY: number,
  fillHex: string
) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const startX = Math.max(0, Math.min(w - 1, Math.floor(normX * w)));
  const startY = Math.max(0, Math.min(h - 1, Math.floor(normY * h)));
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const [fr, fg, fb, fa] = hexToRgba(fillHex);

  const startIdx = (startY * w + startX) * 4;
  const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2], sa = data[startIdx + 3];
  const tol = 38;
  if (Math.abs(sr - fr) <= 4 && Math.abs(sg - fg) <= 4 && Math.abs(sb - fb) <= 4 && Math.abs(sa - fa) <= 4) {
    return;
  }

  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let ptr = 0;
  stack[ptr++] = startY * w + startX;
  visited[startY * w + startX] = 1;

  const matches = (pIdx: number) => {
    const i = pIdx * 4;
    return (
      Math.abs(data[i] - sr) <= tol && Math.abs(data[i + 1] - sg) <= tol &&
      Math.abs(data[i + 2] - sb) <= tol && Math.abs(data[i + 3] - sa) <= tol
    );
  };

  while (ptr > 0) {
    const cur = stack[--ptr];
    const x = cur % w, y = (cur / w) | 0;
    let lx = x;
    while (lx > 0 && !visited[y * w + (lx - 1)] && matches(y * w + (lx - 1))) { lx--; visited[y * w + lx] = 1; }
    let rx = x;
    while (rx < w - 1 && !visited[y * w + (rx + 1)] && matches(y * w + (rx + 1))) { rx++; visited[y * w + rx] = 1; }

    for (let px = lx; px <= rx; px++) {
      const idx = (y * w + px) * 4;
      data[idx] = fr; data[idx + 1] = fg; data[idx + 2] = fb; data[idx + 3] = fa;
      if (y > 0) {
        const up = (y - 1) * w + px;
        if (!visited[up] && matches(up)) { visited[up] = 1; stack[ptr++] = up; }
      }
      if (y < h - 1) {
        const dn = (y + 1) * w + px;
        if (!visited[dn] && matches(dn)) { visited[dn] = 1; stack[ptr++] = dn; }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
}
