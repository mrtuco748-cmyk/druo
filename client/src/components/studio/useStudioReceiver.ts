import { useEffect } from 'react';
import { renderStrokeOnCtx } from './strokeRenderer';
import { StudioBg, StudioEvent, StudioStroke, WORLD_H, WORLD_W } from './types';

interface Opts {
  peerName?: string;
  strokesRef: React.MutableRefObject<StudioStroke[]>;
  myRedoRef: React.MutableRefObject<StudioStroke[]>;
  bgRef: React.MutableRefObject<StudioBg>;
  remoteLiveStrokeRef: React.MutableRefObject<StudioStroke | null>;
  worldCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  setBg: (bg: StudioBg) => void;
  setRemoteCursor: (c: { x: number; y: number; color: string; name: string } | null) => void;
  updateCounters: () => void;
  rebuildWorldCanvas: () => void;
  renderViewport: () => void;
  onRegisterStudioReceiver: (fn: (ev: StudioEvent) => void) => void;
}

export function useStudioReceiver({
  peerName, strokesRef, myRedoRef, bgRef, remoteLiveStrokeRef, worldCanvasRef,
  setBg, setRemoteCursor, updateCounters, rebuildWorldCanvas, renderViewport, onRegisterStudioReceiver,
}: Opts) {
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
          if (wctx) renderStrokeOnCtx(wctx, ev.stroke, WORLD_W, WORLD_H, bgRef.current);
        }
        updateCounters();
        renderViewport();
      } else if (ev.action === 'remove' && ev.id) {
        strokesRef.current = strokesRef.current.filter((s) => s.id !== ev.id);
        updateCounters(); rebuildWorldCanvas();
      } else if (ev.action === 'replace' && Array.isArray(ev.strokes)) {
        strokesRef.current = ev.strokes;
        updateCounters(); rebuildWorldCanvas();
      } else if (ev.action === 'bg' && ev.bg) {
        bgRef.current = ev.bg; setBg(ev.bg);
        updateCounters(); rebuildWorldCanvas();
      } else if (ev.action === 'clear') {
        strokesRef.current = []; myRedoRef.current = []; remoteLiveStrokeRef.current = null;
        updateCounters(); rebuildWorldCanvas();
      } else if (ev.action === 'cursor') {
        setRemoteCursor(ev.cursor ? { x: ev.cursor.x, y: ev.cursor.y, color: ev.cursor.color, name: ev.name || peerName || '' } : null);
      }
    });
  }, [onRegisterStudioReceiver, peerName]);
}
