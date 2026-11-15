import { useRef } from 'react';
import { DrawEvent, DrawPoint, DrawStroke } from './types';

interface Opts {
  active: boolean;
  color: string;
  width: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  strokesRef: React.MutableRefObject<DrawStroke[]>;
  currentLocalStroke: React.MutableRefObject<DrawStroke | null>;
  redraw: () => void;
  onEmitDraw: (ev: DrawEvent) => void;
}

export function useDrawingInteractions({
  active, color, width, canvasRef, strokesRef, currentLocalStroke, redraw, onEmitDraw,
}: Opts) {
  const lastEmitTime = useRef(0);

  const getNormPos = (e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active) return;
    if ('touches' in e && e.cancelable) e.preventDefault();
    const pt = getNormPos(e);
    if (!pt) return;
    const stroke: DrawStroke = { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, color, width, points: [pt] };
    currentLocalStroke.current = stroke;
    lastEmitTime.current = Date.now();
    onEmitDraw({ t: 'draw', action: 'start', stroke });
    redraw();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active || !currentLocalStroke.current) return;
    if ('touches' in e && e.cancelable) e.preventDefault();
    const pt = getNormPos(e);
    if (!pt) return;
    currentLocalStroke.current.points.push(pt);
    redraw();
    const now = Date.now();
    if (now - lastEmitTime.current >= 30) {
      lastEmitTime.current = now;
      onEmitDraw({ t: 'draw', action: 'move', point: pt });
    }
  };

  const handleEnd = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!active || !currentLocalStroke.current) return;
    if (e && 'touches' in e && e.cancelable) e.preventDefault();
    const stroke = currentLocalStroke.current;
    strokesRef.current.push(stroke);
    currentLocalStroke.current = null;
    onEmitDraw({ t: 'draw', action: 'commit', stroke });
    redraw();
  };

  return { handleStart, handleMove, handleEnd };
}
