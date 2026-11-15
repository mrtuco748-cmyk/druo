import { drawWorldBackground, renderStrokeOnCtx } from './strokeRenderer';
import { StudioBg, StudioEvent, StudioPoint, StudioStroke, WORLD_H, WORLD_W } from './types';
import { renderViewportToCanvas } from './viewportRenderer';

interface Opts {
  authorKey: string; myName: string; color: string;
  viewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  worldCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  strokesRef: React.MutableRefObject<StudioStroke[]>; myRedoRef: React.MutableRefObject<StudioStroke[]>;
  bgRef: React.MutableRefObject<StudioBg>; panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>; currentStrokeRef: React.MutableRefObject<StudioStroke | null>;
  remoteLiveStrokeRef: React.MutableRefObject<StudioStroke | null>;
  lastTapStrokeRef: React.MutableRefObject<{ id: string; time: number } | null>;
  setMyUndoCount: (n: number) => void; setMyRedoCount: (n: number) => void;
  setBg: (bg: StudioBg) => void; setMenuOpen: (v: boolean) => void;
  clientToWorldNorm: (cx: number, cy: number) => StudioPoint;
  onSyncLocalState: (strokes: StudioStroke[], bg: StudioBg) => void;
  onEmitStudio: (ev: StudioEvent) => void;
}

export function useStudioCanvasActions(opts: Opts) {
  const updateCounters = () => {
    const mine = opts.strokesRef.current.filter((s) => s.author === opts.authorKey || s.author === opts.myName).length;
    opts.setMyUndoCount(mine);
    opts.setMyRedoCount(opts.myRedoRef.current.length);
    opts.onSyncLocalState([...opts.strokesRef.current], opts.bgRef.current);
  };

  const renderViewport = () =>
    renderViewportToCanvas(opts.viewCanvasRef.current, opts.worldCanvasRef.current, opts.panRef.current, opts.zoomRef.current, opts.bgRef.current, opts.remoteLiveStrokeRef.current, opts.currentStrokeRef.current);

  const rebuildWorldCanvas = () => {
    let wc = opts.worldCanvasRef.current;
    if (!wc) { wc = document.createElement('canvas'); wc.width = WORLD_W; wc.height = WORLD_H; opts.worldCanvasRef.current = wc; }
    const wctx = wc.getContext('2d', { willReadFrequently: true });
    if (!wctx) return;
    drawWorldBackground(wctx, opts.bgRef.current);
    for (const s of opts.strokesRef.current) renderStrokeOnCtx(wctx, s, WORLD_W, WORLD_H, opts.bgRef.current);
    renderViewport();
  };

  const commitStroke = (stroke: StudioStroke) => {
    opts.strokesRef.current.push(stroke); opts.myRedoRef.current = [];
    const wctx = opts.worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (wctx) renderStrokeOnCtx(wctx, stroke, WORLD_W, WORLD_H, opts.bgRef.current);
    updateCounters(); renderViewport(); opts.onEmitStudio({ t: 'studio', action: 'commit', stroke });
  };

  const triggerBucketFill = (cx: number, cy: number) => {
    if (opts.lastTapStrokeRef.current && Date.now() - opts.lastTapStrokeRef.current.time < 350) {
      const strayId = opts.lastTapStrokeRef.current.id;
      const idx = opts.strokesRef.current.findIndex((s) => s.id === strayId);
      if (idx !== -1 && opts.strokesRef.current[idx].points.length <= 3) {
        opts.strokesRef.current.splice(idx, 1); opts.onEmitStudio({ t: 'studio', action: 'remove', id: strayId }); rebuildWorldCanvas();
      }
      opts.lastTapStrokeRef.current = null;
    }
    commitStroke({
      id: `fill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, author: opts.authorKey,
      tool: 'bucket', color: opts.color, size: 1, opacity: 1, points: [opts.clientToWorldNorm(cx, cy)],
    });
  };

  const handleUndoMine = () => {
    for (let i = opts.strokesRef.current.length - 1; i >= 0; i--) {
      const s = opts.strokesRef.current[i];
      if (s.author === opts.authorKey || s.author === opts.myName) {
        const [removed] = opts.strokesRef.current.splice(i, 1);
        opts.myRedoRef.current.push(removed); updateCounters(); rebuildWorldCanvas();
        opts.onEmitStudio({ t: 'studio', action: 'remove', id: removed.id });
        return;
      }
    }
  };

  const handleRedoMine = () => {
    const restored = opts.myRedoRef.current.pop();
    if (!restored) return;
    opts.strokesRef.current.push(restored);
    const wctx = opts.worldCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (wctx) renderStrokeOnCtx(wctx, restored, WORLD_W, WORLD_H, opts.bgRef.current);
    updateCounters(); renderViewport(); opts.onEmitStudio({ t: 'studio', action: 'commit', stroke: restored });
  };

  const handleChangeBg = (nextBg: StudioBg) => {
    opts.bgRef.current = nextBg; opts.setBg(nextBg); updateCounters(); rebuildWorldCanvas(); opts.onEmitStudio({ t: 'studio', action: 'bg', bg: nextBg });
  };
  const handleClearAll = () => {
    opts.strokesRef.current = []; opts.myRedoRef.current = []; updateCounters(); rebuildWorldCanvas();
    opts.onEmitStudio({ t: 'studio', action: 'clear' }); opts.setMenuOpen(false);
  };
  const handleDownloadPng = () => {
    const wc = opts.worldCanvasRef.current; if (!wc) return;
    const a = document.createElement('a'); a.href = wc.toDataURL('image/png'); a.download = `druo-art-${Date.now()}.png`; a.click(); opts.setMenuOpen(false);
  };
  return { updateCounters, renderViewport, rebuildWorldCanvas, commitStroke, triggerBucketFill, handleUndoMine, handleRedoMine, handleChangeBg, handleClearAll, handleDownloadPng };
}
