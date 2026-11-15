import { useEffect } from 'react';
import { DrawEvent, DrawStroke } from './types';

interface Opts {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  strokesRef: React.MutableRefObject<DrawStroke[]>;
  currentRemoteStroke: React.MutableRefObject<DrawStroke | null>;
  currentLocalStroke: React.MutableRefObject<DrawStroke | null>;
  redraw: () => void;
  setPeerDrawing: (drawing: boolean) => void;
  peerTimerRef: React.MutableRefObject<any>;
  onRegisterReceiver?: (receiver: (ev: DrawEvent) => void) => void;
}

export function useCanvasSignaling({
  canvasRef, strokesRef, currentRemoteStroke, currentLocalStroke,
  redraw, setPeerDrawing, peerTimerRef, onRegisterReceiver,
}: Opts) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const w = Math.round(width), h = Math.round(height);
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; redraw(); }
        }
      }
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [canvasRef, redraw]);

  useEffect(() => {
    if (!onRegisterReceiver) return;
    onRegisterReceiver((ev: DrawEvent) => {
      setPeerDrawing(true);
      clearTimeout(peerTimerRef.current);
      peerTimerRef.current = setTimeout(() => setPeerDrawing(false), 2400);

      if (ev.action === 'start' && ev.stroke) {
        currentRemoteStroke.current = ev.stroke;
      } else if (ev.action === 'move' && ev.point) {
        if (!currentRemoteStroke.current && ev.stroke) currentRemoteStroke.current = ev.stroke;
        if (currentRemoteStroke.current) currentRemoteStroke.current.points.push(ev.point);
      } else if (ev.action === 'commit' && ev.stroke) {
        const stroke = ev.stroke;
        const idx = strokesRef.current.findIndex((s) => s.id === stroke.id);
        if (idx >= 0) strokesRef.current[idx] = stroke;
        else strokesRef.current.push(stroke);
        if (currentRemoteStroke.current?.id === stroke.id) currentRemoteStroke.current = null;
      } else if (ev.action === 'end' && currentRemoteStroke.current) {
        strokesRef.current.push(currentRemoteStroke.current);
        currentRemoteStroke.current = null;
      } else if (ev.action === 'clear') {
        strokesRef.current = [];
        currentRemoteStroke.current = null;
        currentLocalStroke.current = null;
      }
      redraw();
    });
  }, [onRegisterReceiver, redraw]);
}
