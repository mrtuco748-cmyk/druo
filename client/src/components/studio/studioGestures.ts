import { StudioEvent, StudioPoint, StudioStroke, StudioTool, WORLD_H, WORLD_W } from './types';

export interface PanStartState {
  clientX: number;
  clientY: number;
  panX: number;
  panY: number;
}

export interface StudioPointerOpts {
  authorKey: string;
  myName: string;
  tool: StudioTool;
  color: string;
  size: number;
  filledShape: boolean;
  menuOpen: boolean;
  bgMenuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  setBgMenuOpen: (v: boolean) => void;
  setTool: (t: StudioTool) => void;
  setColor: (c: string) => void;
  setPan: (p: { x: number; y: number }) => void;
  setZoom: (z: number) => void;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
  spacePressedRef: React.MutableRefObject<boolean>;
  currentStrokeRef: React.MutableRefObject<StudioStroke | null>;
  worldCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  lastTapStrokeRef: React.MutableRefObject<{ id: string; time: number } | null>;
  clientToWorldNorm: (cx: number, cy: number) => StudioPoint;
  renderViewport: () => void;
  triggerBucketFill: (cx: number, cy: number) => void;
  commitStroke: (s: StudioStroke) => void;
  onEmitStudio: (ev: StudioEvent) => void;
}

export function startTwoFingerGesture(
  activePointers: Map<number, { x: number; y: number }>,
  panRef: React.MutableRefObject<{ x: number; y: number }>,
  isPanningRef: React.MutableRefObject<boolean>,
  panStartRef: React.MutableRefObject<PanStartState>,
  pinchDistRef: React.MutableRefObject<number | null>
) {
  const pts = Array.from(activePointers.values());
  isPanningRef.current = true;
  panStartRef.current = { clientX: (pts[0].x + pts[1].x) / 2, clientY: (pts[0].y + pts[1].y) / 2, panX: panRef.current.x, panY: panRef.current.y };
  pinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

export function updateTwoFingerGesture(
  activePointers: Map<number, { x: number; y: number }>,
  panRef: React.MutableRefObject<{ x: number; y: number }>,
  zoomRef: React.MutableRefObject<number>,
  panStartRef: React.MutableRefObject<PanStartState>,
  pinchDistRef: React.MutableRefObject<number | null>,
  setPan: (p: { x: number; y: number }) => void,
  setZoom: (z: number) => void
) {
  const pts = Array.from(activePointers.values());
  const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
  const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  if (pinchDistRef.current && pinchDistRef.current > 10) {
    const nextZoom = Math.max(0.5, Math.min(3.2, zoomRef.current * (d / pinchDistRef.current)));
    zoomRef.current = nextZoom; setZoom(nextZoom); pinchDistRef.current = d;
  }
  const nextPan = { x: panStartRef.current.panX + (midX - panStartRef.current.clientX), y: panStartRef.current.panY + (midY - panStartRef.current.clientY) };
  panRef.current = nextPan; setPan(nextPan);
}

export function pickEyedropperColor(wc: HTMLCanvasElement | null, pt: StudioPoint): string | null {
  const wctx = wc?.getContext('2d', { willReadFrequently: true });
  if (!wctx) return null;
  const px = wctx.getImageData(Math.floor(pt.x * WORLD_W), Math.floor(pt.y * WORLD_H), 1, 1).data;
  return `#${[px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
