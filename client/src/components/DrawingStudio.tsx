import React, { useEffect, useRef, useState } from 'react';
import {
  IconAirbrush,
  IconBrush,
  IconBucket,
  IconCanvasBg,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconClose,
  IconDownload,
  IconEraser,
  IconEyedropper,
  IconHand,
  IconHeart,
  IconHome,
  IconLine,
  IconMarker,
  IconPen,
  IconRect,
  IconResetView,
  IconSparkle,
  IconStar,
  IconTrash,
} from './KawaiiIcons';

export type StudioTool =
  | 'pen'
  | 'marker'
  | 'neon'
  | 'airbrush'
  | 'eraser'
  | 'bucket'
  | 'pan'
  | 'line'
  | 'rect'
  | 'circle'
  | 'heart'
  | 'star'
  | 'eyedropper';

export type StudioBg = string;

export interface StudioPoint {
  x: number;
  y: number;
}

export interface StudioStroke {
  id: string;
  author?: string;
  tool: StudioTool;
  color: string;
  size: number;
  opacity: number;
  points: StudioPoint[];
  filled?: boolean;
}

export interface StudioEvent {
  t: 'studio';
  action: 'live' | 'commit' | 'remove' | 'replace' | 'bg' | 'clear' | 'cursor' | 'pictionary';
  stroke?: StudioStroke | null;
  strokes?: StudioStroke[];
  id?: string;
  bg?: StudioBg;
  cursor?: { x: number; y: number; color: string; tool: string } | null;
  from?: string;
  name?: string;
}

interface Props {
  myId?: string;
  myName: string;
  peerName?: string;
  initialStrokes: StudioStroke[];
  initialBg: StudioBg;
  onEmitStudio: (ev: StudioEvent) => void;
  onRegisterStudioReceiver: (fn: (ev: StudioEvent) => void) => void;
  onSyncLocalState: (strokes: StudioStroke[], bg: StudioBg) => void;
  onBackToHub: () => void;
}

const WORLD_W = 1400;
const WORLD_H = 900;

const KAWAII_PALETTE = [
  '#4a3b52', // Deep plum charcoal
  '#ff85a2', // Pastel Sakura Pink
  '#ff5c8a', // Berry Rose
  '#ffb385', // Pastel Peach
  '#ffe082', // Pastel Lemon Butter
  '#8ce99a', // Pastel Mint
  '#74e3c4', // Pastel Aqua
  '#91c9ff', // Pastel Baby Blue
  '#b89eff', // Pastel Lavender
  '#f3a6ff', // Pastel Orchid
  '#ffadad', // Soft Coral
  '#ffffff', // Pure White
];

const BG_COLORS: Record<string, string> = {
  night: '#180d17',
  pink: '#3b172c',
  plum: '#1d152e',
  grid: '#231222',
  cream: '#fff7ee',
  white: '#ffffff',
  pastelPink: '#ffdbe9',
  mint: '#e3faee',
  sky: '#e3f2fd',
  dots: '#fff2f7',
  gridLight: '#fff9fc',
};

const BG_PRESET_LIST: { id: StudioBg; pattern?: 'grid' | 'dots' }[] = [
  { id: 'night' },
  { id: 'pink' },
  { id: 'plum' },
  { id: 'grid', pattern: 'grid' },
  { id: 'white' },
  { id: 'cream' },
  { id: 'pastelPink' },
  { id: 'mint' },
  { id: 'sky' },
  { id: 'dots', pattern: 'dots' },
  { id: 'gridLight', pattern: 'grid' },
];

function resolveBgColor(mode: StudioBg): string {
  if (BG_COLORS[mode]) return BG_COLORS[mode];
  if (typeof mode === 'string' && mode.startsWith('#')) return mode;
  return '#180d17';
}


function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16
  );
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  normX: number,
  normY: number,
  fillHex: string
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const startX = Math.max(0, Math.min(w - 1, Math.floor(normX * w)));
  const startY = Math.max(0, Math.min(h - 1, Math.floor(normY * h)));

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const [fr, fg, fb, fa] = hexToRgba(fillHex);

  const startIdx = (startY * w + startX) * 4;
  const sr = data[startIdx];
  const sg = data[startIdx + 1];
  const sb = data[startIdx + 2];
  const sa = data[startIdx + 3];

  const tol = 38;
  if (
    Math.abs(sr - fr) <= 4 &&
    Math.abs(sg - fg) <= 4 &&
    Math.abs(sb - fb) <= 4 &&
    Math.abs(sa - fa) <= 4
  ) {
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
      Math.abs(data[i] - sr) <= tol &&
      Math.abs(data[i + 1] - sg) <= tol &&
      Math.abs(data[i + 2] - sb) <= tol &&
      Math.abs(data[i + 3] - sa) <= tol
    );
  };

  while (ptr > 0) {
    const cur = stack[--ptr];
    const x = cur % w;
    const y = (cur / w) | 0;

    let lx = x;
    while (lx > 0 && !visited[y * w + (lx - 1)] && matches(y * w + (lx - 1))) {
      lx--;
      visited[y * w + lx] = 1;
    }

    let rx = x;
    while (rx < w - 1 && !visited[y * w + (rx + 1)] && matches(y * w + (rx + 1))) {
      rx++;
      visited[y * w + rx] = 1;
    }

    for (let px = lx; px <= rx; px++) {
      const idx = (y * w + px) * 4;
      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = fa;

      if (y > 0) {
        const up = (y - 1) * w + px;
        if (!visited[up] && matches(up)) {
          visited[up] = 1;
          stack[ptr++] = up;
        }
      }
      if (y < h - 1) {
        const dn = (y + 1) * w + px;
        if (!visited[dn] && matches(dn)) {
          visited[dn] = 1;
          stack[ptr++] = dn;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export const DrawingStudio: React.FC<Props> = ({
  myId,
  myName,
  peerName,
  initialStrokes,
  initialBg,
  onEmitStudio,
  onRegisterStudioReceiver,
  onSyncLocalState,
  onBackToHub,
}) => {
  // 1. TODOS LOS HOOKS DECLARADOS AL PRINCIPIO (evita TDZ ReferenceError)
  const authorKey = myId || myName;
  const [tool, setTool] = useState<StudioTool>('pen');
  const [color, setColor] = useState<string>('#ff85a2');
  const [size, setSize] = useState<number>(8);
  const [filledShape, setFilledShape] = useState<boolean>(false);
  const [bg, setBg] = useState<StudioBg>(initialBg || 'night');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [bgMenuOpen, setBgMenuOpen] = useState<boolean>(false);

  // Pan y Zoom INDEPENDIENTE para cada usuario
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);

  // Contadores de trazos propios para habilitar/deshabilitar < y >
  const [myUndoCount, setMyUndoCount] = useState<number>(0);
  const [myRedoCount, setMyRedoCount] = useState<number>(0);
  const [remoteCursor, setRemoteCursor] = useState<{
    x: number;
    y: number;
    color: string;
    name: string;
  } | null>(null);

  const viewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const strokesRef = useRef<StudioStroke[]>(initialStrokes || []);
  const myRedoRef = useRef<StudioStroke[]>([]);
  const bgRef = useRef<StudioBg>(initialBg || 'night');

  const currentStrokeRef = useRef<StudioStroke | null>(null);
  const remoteLiveStrokeRef = useRef<StudioStroke | null>(null);

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef<number | null>(null);
  const spacePressedRef = useRef<boolean>(false);

  const lastTapRef = useRef<{ time: number; clientX: number; clientY: number }>({
    time: 0,
    clientX: 0,
    clientY: 0,
  });
  const lastTapStrokeRef = useRef<{ id: string; time: number } | null>(null);
  const lastLiveEmitRef = useRef<number>(0);

  const updateCounters = () => {
    const mine = strokesRef.current.filter(
      (s) => s.author === authorKey || s.author === myName
    ).length;
    setMyUndoCount(mine);
    setMyRedoCount(myRedoRef.current.length);
    onSyncLocalState([...strokesRef.current], bgRef.current);
  };

  const drawWorldBackground = (ctx: CanvasRenderingContext2D, mode: StudioBg) => {
    ctx.save();
    ctx.fillStyle = resolveBgColor(mode);
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    if (mode === 'grid' || mode === 'gridLight') {
      ctx.strokeStyle =
        mode === 'gridLight'
          ? 'rgba(224, 83, 124, 0.16)'
          : 'rgba(255, 145, 185, 0.16)';
      ctx.lineWidth = 1;
      const step = 32;
      ctx.beginPath();
      for (let x = step; x < WORLD_W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_H);
      }
      for (let y = step; y < WORLD_H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_W, y);
      }
      ctx.stroke();
    } else if (mode === 'dots') {
      ctx.fillStyle = 'rgba(224, 83, 124, 0.28)';
      const step = 28;
      for (let x = step; x < WORLD_W; x += step) {
        for (let y = step; y < WORLD_H; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  const renderStrokeOnCtx = (
    ctx: CanvasRenderingContext2D,
    s: StudioStroke,
    w: number,
    h: number
  ) => {
    if (!s.points || s.points.length === 0) return;

    if (s.tool === 'bucket') {
      const p0 = s.points[0];
      floodFillCanvas(ctx, p0.x, p0.y, s.color);
      return;
    }

    ctx.save();
    const scale = w / 1000;
    const strokePx = Math.max(1.5, s.size * scale);
    const strokeColor = s.tool === 'eraser' ? resolveBgColor(bgRef.current) : s.color;


    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokePx;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = s.tool === 'marker' ? 0.42 : s.tool === 'airbrush' ? 0.28 : 1;

    if (s.tool === 'neon') {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = strokePx * 2.2;
    } else if (s.tool === 'airbrush') {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = strokePx * 1.8;
    }

    const p0 = s.points[0];
    const pLast = s.points[s.points.length - 1];
    const x0 = p0.x * w;
    const y0 = p0.y * h;
    const x1 = pLast.x * w;
    const y1 = pLast.y * h;

    if (s.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'rect') {
      const rx = Math.min(x0, x1);
      const ry = Math.min(y0, y1);
      const rw = Math.abs(x1 - x0);
      const rh = Math.abs(y1 - y0);
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 6);
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'circle') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.max(2, Math.abs(x1 - x0) / 2);
      const ry = Math.max(2, Math.abs(y1 - y0) / 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'heart') {
      const cx = (x0 + x1) / 2;
      const topY = Math.min(y0, y1);
      const rw = Math.max(8, Math.abs(x1 - x0));
      const rh = Math.max(8, Math.abs(y1 - y0));
      ctx.beginPath();
      const dY = rh * 0.3;
      ctx.moveTo(cx, topY + dY);
      ctx.bezierCurveTo(cx, topY, cx - rw / 2, topY, cx - rw / 2, topY + dY);
      ctx.bezierCurveTo(
        cx - rw / 2,
        topY + (rh + dY) / 2,
        cx,
        topY + (rh + dY) / 1.45,
        cx,
        topY + rh
      );
      ctx.bezierCurveTo(
        cx,
        topY + (rh + dY) / 1.45,
        cx + rw / 2,
        topY + (rh + dY) / 2,
        cx + rw / 2,
        topY + dY
      );
      ctx.bezierCurveTo(cx + rw / 2, topY, cx, topY, cx, topY + dY);
      ctx.closePath();
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'star') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const outerR = Math.max(6, Math.hypot(x1 - x0, y1 - y0) / 2);
      const innerR = outerR * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Trazo libre suavizado con curvas de Bézier
    ctx.beginPath();
    if (s.points.length === 1) {
      ctx.arc(x0, y0, strokePx / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(x0, y0);
      for (let i = 1; i < s.points.length - 1; i++) {
        const curr = s.points[i];
        const next = s.points[i + 1];
        const midX = ((curr.x + next.x) / 2) * w;
        const midY = ((curr.y + next.y) / 2) * h;
        ctx.quadraticCurveTo(curr.x * w, curr.y * h, midX, midY);
      }
      ctx.lineTo(x1, y1);
      ctx.stroke();

      if (s.tool === 'neon') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, strokePx * 0.36);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // Reconstruir el lienzo de mundo completo (incluyendo baldes de pintura en orden)
  const rebuildWorldCanvas = () => {
    let wc = worldCanvasRef.current;
    if (!wc) {
      wc = document.createElement('canvas');
      wc.width = WORLD_W;
      wc.height = WORLD_H;
      worldCanvasRef.current = wc;
    }
    const wctx = wc.getContext('2d', { willReadFrequently: true });
    if (!wctx) return;

    drawWorldBackground(wctx, bgRef.current);
    for (const s of strokesRef.current) {
      renderStrokeOnCtx(wctx, s, WORLD_W, WORLD_H);
    }
    renderViewport();
  };

  // Dibujar el lienzo visible aplicando el pan y zoom local de este usuario
  const renderViewport = () => {
    const vc = viewCanvasRef.current;
    const wc = worldCanvasRef.current;
    if (!vc || !wc) return;
    const ctx = vc.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const vw = vc.width / dpr;
    const vh = vc.height / dpr;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fondo exterior rosa oscuro nocturno (mesa de trabajo)
    ctx.fillStyle = '#160b14';
    ctx.fillRect(0, 0, vw, vh);

    // Calcular caja base centrada de la hoja (en móvil aprovechamos casi el 100% del ancho)
    const pad = vw < 600 ? 8 : 24;
    const scaleFit = Math.min((vw - pad) / WORLD_W, (vh - pad) / WORLD_H);
    const sheetW = WORLD_W * scaleFit;
    const sheetH = WORLD_H * scaleFit;
    const baseX = (vw - sheetW) / 2;
    const baseY = (vh - sheetH) / 2;

    // Aplicar Pan y Zoom independientes de este usuario alrededor del centro
    ctx.translate(vw / 2 + panRef.current.x, vh / 2 + panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);
    ctx.translate(-vw / 2, -vh / 2);

    // Sombra suave de la hoja
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = resolveBgColor(bgRef.current);
    ctx.beginPath();
    ctx.roundRect(baseX, baseY, sheetW, sheetH, 14);
    ctx.fill();
    ctx.restore();

    // Recortar a los bordes redondeados de la hoja y volcar el worldCanvas
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(baseX, baseY, sheetW, sheetH, 14);
    ctx.clip();
    ctx.drawImage(wc, baseX, baseY, sheetW, sheetH);

    // Si hay trazos en vivo (mío o de mi pareja), dibujarlos encima en coordenadas de la hoja
    if (remoteLiveStrokeRef.current || currentStrokeRef.current) {
      ctx.translate(baseX, baseY);
      if (remoteLiveStrokeRef.current) {
        renderStrokeOnCtx(ctx, remoteLiveStrokeRef.current, sheetW, sheetH);
      }
      if (currentStrokeRef.current) {
        renderStrokeOnCtx(ctx, currentStrokeRef.current, sheetW, sheetH);
      }
    }
    ctx.restore();

    // Borde pastel de la hoja
    ctx.strokeStyle = 'rgba(255, 158, 187, 0.55)';
    ctx.lineWidth = 2 / zoomRef.current;
    ctx.beginPath();
    ctx.roundRect(baseX, baseY, sheetW, sheetH, 14);
    ctx.stroke();

    ctx.restore();
  };

  // Convertir coordenadas de pantalla (clientX, clientY) a coordenadas normalizadas [0..1] de la hoja
  const clientToWorldNorm = (clientX: number, clientY: number): StudioPoint => {
    const vc = viewCanvasRef.current;
    if (!vc) return { x: 0.5, y: 0.5 };
    const rect = vc.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    // Invertir Pan y Zoom
    const ux = (sx - vw / 2 - panRef.current.x) / zoomRef.current + vw / 2;
    const uy = (sy - vh / 2 - panRef.current.y) / zoomRef.current + vh / 2;

    const pad = vw < 600 ? 8 : 24;
    const scaleFit = Math.min((vw - pad) / WORLD_W, (vh - pad) / WORLD_H);
    const sheetW = WORLD_W * scaleFit;
    const sheetH = WORLD_H * scaleFit;
    const baseX = (vw - sheetW) / 2;
    const baseY = (vh - sheetH) / 2;

    const nx = (ux - baseX) / sheetW;
    const ny = (uy - baseY) / sheetH;

    return {
      x: Math.max(0, Math.min(1, Number(nx.toFixed(4)))),
      y: Math.max(0, Math.min(1, Number(ny.toFixed(4)))),
    };
  };

  // Convertir coordenadas normalizadas [0..1] de la hoja a porcentaje de pantalla para el cursor remoto
  const worldNormToScreenPct = (wx: number, wy: number) => {
    const vc = viewCanvasRef.current;
    if (!vc) return { left: '50%', top: '50%' };
    const rect = vc.getBoundingClientRect();
    const vw = rect.width || 1;
    const vh = rect.height || 1;

    const pad = vw < 600 ? 8 : 24;
    const scaleFit = Math.min((vw - pad) / WORLD_W, (vh - pad) / WORLD_H);
    const sheetW = WORLD_W * scaleFit;
    const sheetH = WORLD_H * scaleFit;
    const baseX = (vw - sheetW) / 2;
    const baseY = (vh - sheetH) / 2;

    const ux = baseX + wx * sheetW;
    const uy = baseY + wy * sheetH;

    const sx = (ux - vw / 2) * zoomRef.current + vw / 2 + panRef.current.x;
    const sy = (uy - vh / 2) * zoomRef.current + vh / 2 + panRef.current.y;

    return {
      left: `${(sx / vw) * 100}%`,
      top: `${(sy / vh) * 100}%`,
    };
  };

  // Inicializar tamaño del canvas y reconstruir hoja
  useEffect(() => {
    const vc = viewCanvasRef.current;
    if (!vc) return;
    const updateSize = () => {
      const rect = vc.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      vc.width = Math.max(320, Math.floor(rect.width * dpr));
      vc.height = Math.max(220, Math.floor(rect.height * dpr));
      renderViewport();
    };
    rebuildWorldCanvas();
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(vc);
    return () => ro.disconnect();
  }, []);

  // Tecla Espacio para mover el lienzo + Ctrl+Z / Ctrl+Y para tus propios trazos
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spacePressedRef.current = true;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedoMine();
        else handleUndoMine();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedoMine();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spacePressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  // Receptor en tiempo real de eventos de la pareja
  useEffect(() => {
    onRegisterStudioReceiver((ev: StudioEvent) => {
      if (ev.action === 'live') {
        remoteLiveStrokeRef.current = ev.stroke || null;
        renderViewport();
      } else if (ev.action === 'commit' && ev.stroke) {
        remoteLiveStrokeRef.current = null;
        if (!strokesRef.current.some((s) => s.id === ev.stroke!.id)) {
          strokesRef.current.push(ev.stroke);
          const wctx = worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
          if (wctx) renderStrokeOnCtx(wctx, ev.stroke, WORLD_W, WORLD_H);
        }
        updateCounters();
        renderViewport();
      } else if (ev.action === 'remove' && ev.id) {
        strokesRef.current = strokesRef.current.filter((s) => s.id !== ev.id);
        updateCounters();
        rebuildWorldCanvas();
      } else if (ev.action === 'replace' && Array.isArray(ev.strokes)) {
        strokesRef.current = ev.strokes;
        updateCounters();
        rebuildWorldCanvas();
      } else if (ev.action === 'bg' && ev.bg) {
        bgRef.current = ev.bg;
        setBg(ev.bg);
        updateCounters();
        rebuildWorldCanvas();
      } else if (ev.action === 'clear') {
        strokesRef.current = [];
        myRedoRef.current = [];
        remoteLiveStrokeRef.current = null;
        updateCounters();
        rebuildWorldCanvas();
      } else if (ev.action === 'cursor') {
        if (ev.cursor) {
          setRemoteCursor({
            x: ev.cursor.x,
            y: ev.cursor.y,
            color: ev.cursor.color,
            name: ev.name || peerName || '',
          });
        } else {
          setRemoteCursor(null);
        }
      }
    });
  }, [onRegisterStudioReceiver, peerName]);

  const commitStroke = (stroke: StudioStroke) => {
    strokesRef.current.push(stroke);
    myRedoRef.current = [];
    const wctx = worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (wctx) renderStrokeOnCtx(wctx, stroke, WORLD_W, WORLD_H);
    updateCounters();
    renderViewport();
    onEmitStudio({ t: 'studio', action: 'commit', stroke });
  };

  // Balde de pintura (se activa con doble toque/doble clic o con la herramienta balde)
  const triggerBucketFill = (clientX: number, clientY: number) => {
    // Si el primer toque del doble-toque acaba de dejar un puntito hace < 350ms, lo limpiamos
    if (
      lastTapStrokeRef.current &&
      Date.now() - lastTapStrokeRef.current.time < 350
    ) {
      const strayId = lastTapStrokeRef.current.id;
      const idx = strokesRef.current.findIndex((s) => s.id === strayId);
      if (idx !== -1 && strokesRef.current[idx].points.length <= 3) {
        strokesRef.current.splice(idx, 1);
        onEmitStudio({ t: 'studio', action: 'remove', id: strayId });
        rebuildWorldCanvas();
      }
      lastTapStrokeRef.current = null;
    }

    const pt = clientToWorldNorm(clientX, clientY);
    const fillStroke: StudioStroke = {
      id: `fill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: authorKey,
      tool: 'bucket',
      color,
      size: 1,
      opacity: 1,
      points: [pt],
    };
    commitStroke(fillStroke);
  };

  // Deshacer SOLO MI último trazo (<)
  const handleUndoMine = () => {
    for (let i = strokesRef.current.length - 1; i >= 0; i--) {
      const s = strokesRef.current[i];
      if (s.author === authorKey || s.author === myName) {
        const [removed] = strokesRef.current.splice(i, 1);
        myRedoRef.current.push(removed);
        updateCounters();
        rebuildWorldCanvas();
        onEmitStudio({ t: 'studio', action: 'remove', id: removed.id });
        return;
      }
    }
  };

  // Rehacer SOLO MI trazo deshecho (>)
  const handleRedoMine = () => {
    const restored = myRedoRef.current.pop();
    if (!restored) return;
    strokesRef.current.push(restored);
    const wctx = worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (wctx) renderStrokeOnCtx(wctx, restored, WORLD_W, WORLD_H);
    updateCounters();
    renderViewport();
    onEmitStudio({ t: 'studio', action: 'commit', stroke: restored });
  };

  const handleResetView = () => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    setPan({ x: 0, y: 0 });
    setZoom(1);
    renderViewport();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (menuOpen) setMenuOpen(false);
    if (bgMenuOpen) setBgMenuOpen(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Si hay 2 dedos en pantalla -> modo Pan/Pinch automático del lienzo local
    if (activePointersRef.current.size === 2) {
      currentStrokeRef.current = null;
      const pts = Array.from(activePointersRef.current.values());
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: midX,
        clientY: midY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      pinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      renderViewport();
      return;
    }

    // Detectar Doble Toque (Double-Tap) para rellenar con Balde de Pintura
    const now = Date.now();
    const dt = now - lastTapRef.current.time;
    const dist = Math.hypot(
      e.clientX - lastTapRef.current.clientX,
      e.clientY - lastTapRef.current.clientY
    );
    lastTapRef.current = { time: now, clientX: e.clientX, clientY: e.clientY };

    if (dt < 290 && dist < 28 && tool !== 'pan') {
      currentStrokeRef.current = null;
      triggerBucketFill(e.clientX, e.clientY);
      return;
    }

    // Si está en herramienta Mano (pan), o clic medio/derecho, o barra espaciadora -> mover lienzo local
    if (tool === 'pan' || e.button === 1 || e.button === 2 || spacePressedRef.current) {
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      return;
    }

    // Si eligió explícitamente el Balde en el menú -> rellenar con 1 toque
    if (tool === 'bucket') {
      triggerBucketFill(e.clientX, e.clientY);
      return;
    }

    const pt = clientToWorldNorm(e.clientX, e.clientY);

    if (tool === 'eyedropper') {
      const wctx = worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
      if (wctx) {
        const px = wctx.getImageData(
          Math.floor(pt.x * WORLD_W),
          Math.floor(pt.y * WORLD_H),
          1,
          1
        ).data;
        const hex = `#${[px[0], px[1], px[2]]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')}`;
        setColor(hex);
        setTool('pen');
      }
      return;
    }

    const stroke: StudioStroke = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: authorKey,
      tool,
      color,
      size,
      opacity: 1,
      points: [pt],
      filled: filledShape,
    };
    currentStrokeRef.current = stroke;
    renderViewport();
    onEmitStudio({ t: 'studio', action: 'live', stroke });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom + Pan de 2 dedos
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);

      if (pinchDistRef.current && pinchDistRef.current > 10) {
        const ratio = d / pinchDistRef.current;
        const nextZoom = Math.max(0.5, Math.min(3.2, zoomRef.current * ratio));
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        pinchDistRef.current = d;
      }

      const nextPan = {
        x: panStartRef.current.panX + (midX - panStartRef.current.clientX),
        y: panStartRef.current.panY + (midY - panStartRef.current.clientY),
      };
      panRef.current = nextPan;
      setPan(nextPan);
      renderViewport();
      return;
    }

    // Pan de 1 dedo / mouse con herramienta Mano
    if (isPanningRef.current) {
      const nextPan = {
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.clientX),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.clientY),
      };
      panRef.current = nextPan;
      setPan(nextPan);
      renderViewport();
      return;
    }

    const pt = clientToWorldNorm(e.clientX, e.clientY);
    const now = performance.now();

    if (now - lastLiveEmitRef.current > 45) {
      onEmitStudio({
        t: 'studio',
        action: 'cursor',
        cursor: { x: pt.x, y: pt.y, color, tool },
        name: myName,
      });
    }

    const cur = currentStrokeRef.current;
    if (!cur) return;

    if (
      cur.tool === 'line' ||
      cur.tool === 'rect' ||
      cur.tool === 'circle' ||
      cur.tool === 'heart' ||
      cur.tool === 'star'
    ) {
      cur.points = [cur.points[0], pt];
    } else {
      cur.points.push(pt);
    }

    renderViewport();
    if (now - lastLiveEmitRef.current > 28) {
      lastLiveEmitRef.current = now;
      onEmitStudio({ t: 'studio', action: 'live', stroke: cur });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchDistRef.current = null;
    }
    if (isPanningRef.current && activePointersRef.current.size === 0) {
      isPanningRef.current = false;
      return;
    }

    const cur = currentStrokeRef.current;
    if (!cur) return;
    currentStrokeRef.current = null;

    if (cur.points.length <= 3) {
      lastTapStrokeRef.current = { id: cur.id, time: Date.now() };
    }
    commitStroke(cur);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.5, Math.min(3.2, Number((zoomRef.current * factor).toFixed(2))));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    renderViewport();
  };

  const handleChangeBg = (nextBg: StudioBg) => {
    bgRef.current = nextBg;
    setBg(nextBg);
    updateCounters();
    rebuildWorldCanvas();
    onEmitStudio({ t: 'studio', action: 'bg', bg: nextBg });
  };

  const handleClearAll = () => {
    strokesRef.current = [];
    myRedoRef.current = [];
    updateCounters();
    rebuildWorldCanvas();
    onEmitStudio({ t: 'studio', action: 'clear' });
    setMenuOpen(false);
  };

  const handleDownloadPng = () => {
    const wc = worldCanvasRef.current;
    if (!wc) return;
    const a = document.createElement('a');
    a.href = wc.toDataURL('image/png');
    a.download = `druo-art-${Date.now()}.png`;
    a.click();
    setMenuOpen(false);
  };

  const renderActiveToolIcon = (t: StudioTool, sz = 22) => {
    switch (t) {
      case 'pen':
        return <IconPen size={sz} />;
      case 'marker':
        return <IconMarker size={sz} />;
      case 'neon':
        return <IconSparkle size={sz} />;
      case 'airbrush':
        return <IconAirbrush size={sz} />;
      case 'bucket':
        return <IconBucket size={sz} />;
      case 'eraser':
        return <IconEraser size={sz} />;
      case 'pan':
        return <IconHand size={sz} />;
      case 'line':
        return <IconLine size={sz} />;
      case 'rect':
        return <IconRect size={sz} />;
      case 'circle':
        return <IconCircle size={sz} />;
      case 'heart':
        return <IconHeart size={sz} />;
      case 'star':
        return <IconStar size={sz} />;
      case 'eyedropper':
        return <IconEyedropper size={sz} />;
      default:
        return <IconBrush size={sz} />;
    }
  };

  const isViewMoved = pan.x !== 0 || pan.y !== 0 || zoom !== 1;
  const currentBgHex = resolveBgColor(bg);
  const cursorPos = remoteCursor
    ? worldNormToScreenPct(remoteCursor.x, remoteCursor.y)
    : null;

  return (
    <main className="cinema-stage studio-stage">
      <div className="screen-bezel studio-bezel kawaii-clean-studio">
        <div className="studio-canvas-container">
          <canvas
            ref={viewCanvasRef}
            className={`studio-canvas tool-${tool}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            onPointerLeave={() =>
              onEmitStudio({ t: 'studio', action: 'cursor', cursor: null })
            }
          />

          {/* Cursor en vivo del otro participante */}
          {remoteCursor && cursorPos && (
            <div
              className="studio-remote-cursor"
              style={{
                left: cursorPos.left,
                top: cursorPos.top,
              }}
            >
              <span className="rc-dot" style={{ background: remoteCursor.color }} />
            </div>
          )}

          {/* Esquina Superior Izquierda: Inicio + Mover Lienzo + Selector de Fondo del Lienzo */}
          <div className="kawaii-floating-top-left">
            <button
              type="button"
              className="kawaii-icon-circle"
              onClick={onBackToHub}
              aria-label="Home"
            >
              <IconHome size={20} />
            </button>

            <button
              type="button"
              className={`kawaii-icon-circle ${tool === 'pan' ? 'active' : ''}`}
              onClick={() => setTool((prev) => (prev === 'pan' ? 'pen' : 'pan'))}
              aria-label="Move Canvas"
            >
              <IconHand size={20} />
            </button>

            {/* Botón directo para elegir el Fondo del Lienzo */}
            <div className="kawaii-bg-picker-anchor">
              <button
                type="button"
                className={`kawaii-icon-circle kawaii-bg-trigger-btn ${bgMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setBgMenuOpen((o) => !o);
                  setMenuOpen(false);
                }}
                aria-label="Canvas Background"
              >
                <IconCanvasBg size={19} />
                <span
                  className="kawaii-bg-live-indicator"
                  style={{ background: currentBgHex }}
                />
              </button>

              {bgMenuOpen && (
                <div className="kawaii-bg-popover">
                  <div className="kawaii-bg-grid">
                    {/* Color libre personalizado para el fondo del lienzo */}
                    <label
                      className="kawaii-bg-swatch custom"
                      title="Color personalizado de lienzo"
                    >
                      <input
                        type="color"
                        value={currentBgHex}
                        onChange={(e) => handleChangeBg(e.target.value)}
                      />
                      <span
                        className="kawaii-bg-swatch-fill"
                        style={{ background: currentBgHex }}
                      />
                      <span className="kawaii-bg-plus">+</span>
                    </label>

                    {BG_PRESET_LIST.map((item) => {
                      const cHex = resolveBgColor(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`kawaii-bg-swatch ${bg === item.id ? 'active' : ''} ${
                            item.pattern ? `pattern-${item.pattern}` : ''
                          }`}
                          style={{ backgroundColor: cHex }}
                          onClick={() => handleChangeBg(item.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {isViewMoved && (
              <button
                type="button"
                className="kawaii-icon-circle soft"
                onClick={handleResetView}
                aria-label="Reset View"
              >
                <IconResetView size={18} />
              </button>
            )}
          </div>

          {/* Esquina Superior Derecha: Botones < > para Deshacer y Rehacer TUS PROPIOS trazos */}
          <div className="kawaii-floating-top-right">
            <div className="kawaii-undo-pill">
              <button
                type="button"
                className="kawaii-chevron-btn"
                onClick={handleUndoMine}
                disabled={myUndoCount === 0}
                aria-label="Undo my stroke"
              >
                <IconChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="kawaii-chevron-btn"
                onClick={handleRedoMine}
                disabled={myRedoCount === 0}
                aria-label="Redo my stroke"
              >
                <IconChevronRight size={22} />
              </button>
            </div>
          </div>

          {/* Único Botón Circular Flotante de Herramientas (Solo Iconos, Cero Emojis, Cero Texto) */}
          <div className="kawaii-fab-wrapper">
            {menuOpen && (
              <div className="kawaii-fab-popover">
                {/* 1. Herramientas (Solo Iconos SVG) */}
                <div className="kawaii-tools-grid">
                  {(
                    [
                      'pen',
                      'marker',
                      'neon',
                      'airbrush',
                      'bucket',
                      'eraser',
                      'pan',
                      'line',
                      'rect',
                      'circle',
                      'heart',
                      'eyedropper',
                    ] as StudioTool[]
                  ).map((tId) => (
                    <button
                      key={tId}
                      type="button"
                      className={`kawaii-tool-icon-btn ${tool === tId ? 'active' : ''}`}
                      onClick={() => {
                        setTool(tId);
                      }}
                    >
                      {renderActiveToolIcon(tId, 19)}
                    </button>
                  ))}
                </div>

                {/* 2. Colores Pastel Kawaii */}
                <div className="kawaii-swatches-row">
                  <label className="kawaii-custom-color">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        if (tool === 'eraser' || tool === 'pan') setTool('pen');
                      }}
                    />
                    <span className="kawaii-color-ring" style={{ background: color }} />
                  </label>
                  {KAWAII_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`kawaii-swatch-dot ${color === c && tool !== 'eraser' ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => {
                        setColor(c);
                        if (tool === 'eraser' || tool === 'pan') setTool('pen');
                      }}
                    />
                  ))}
                </div>

                {/* 3. Grosor del Trazo (Solo Iconos Círculo Chico -> Grande) */}
                <div className="kawaii-slider-row">
                  <span className="dot-min" />
                  <input
                    type="range"
                    min={2}
                    max={48}
                    step={1}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  />
                  <span className="dot-max" />
                </div>

                {/* 4. Fondos de Hoja + Relleno de Figura + Descargar + Limpiar (Solo Iconos) */}
                <div className="kawaii-bottom-actions">
                  <div className="kawaii-bg-dots">
                    <label className="kawaii-bg-dot custom">
                      <input
                        type="color"
                        value={currentBgHex}
                        onChange={(e) => handleChangeBg(e.target.value)}
                      />
                      <span
                        className="kawaii-bg-dot-fill"
                        style={{ background: currentBgHex }}
                      />
                    </label>
                    {(
                      ['night', 'pink', 'white', 'cream', 'pastelPink', 'grid', 'dots'] as StudioBg[]
                    ).map((bKey) => (
                      <button
                        key={bKey}
                        type="button"
                        className={`kawaii-bg-dot ${bg === bKey ? 'active' : ''} ${
                          bKey === 'grid' ? 'pattern-grid' : bKey === 'dots' ? 'pattern-dots' : ''
                        }`}
                        style={{ backgroundColor: resolveBgColor(bKey) }}
                        onClick={() => handleChangeBg(bKey)}
                      />
                    ))}
                  </div>

                  <div className="kawaii-util-btns">
                    <button
                      type="button"
                      className={`kawaii-tool-icon-btn ${filledShape ? 'active' : ''}`}
                      onClick={() => setFilledShape((f) => !f)}
                    >
                      <IconCircle size={18} />
                    </button>
                    <button
                      type="button"
                      className="kawaii-tool-icon-btn"
                      onClick={handleDownloadPng}
                    >
                      <IconDownload size={18} />
                    </button>
                    <button
                      type="button"
                      className="kawaii-tool-icon-btn danger"
                      onClick={handleClearAll}
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              className={`kawaii-main-fab ${menuOpen ? 'open' : ''}`}
              style={{ '--fab-color': color } as React.CSSProperties}
              onClick={() => {
                setMenuOpen((o) => !o);
                setBgMenuOpen(false);
              }}
              aria-label="Tools"
            >
              {menuOpen ? <IconClose size={24} /> : renderActiveToolIcon(tool, 24)}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
