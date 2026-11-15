import { useRef } from 'react';
import {
  PanStartState, pickEyedropperColor, startTwoFingerGesture,
  StudioPointerOpts, updateTwoFingerGesture,
} from './studioGestures';
import { StudioStroke } from './types';

export function useStudioPointers(opts: StudioPointerOpts) {
  const isPanningRef = useRef(false);
  const panStartRef = useRef<PanStartState>({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef<number | null>(null);
  const lastTapRef = useRef({ time: 0, clientX: 0, clientY: 0 });
  const lastLiveEmitRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (opts.menuOpen) opts.setMenuOpen(false);
    if (opts.bgMenuOpen) opts.setBgMenuOpen(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      opts.currentStrokeRef.current = null;
      startTwoFingerGesture(activePointersRef.current, opts.panRef, isPanningRef, panStartRef, pinchDistRef);
      opts.renderViewport(); return;
    }

    const now = Date.now(), dt = now - lastTapRef.current.time;
    const dist = Math.hypot(e.clientX - lastTapRef.current.clientX, e.clientY - lastTapRef.current.clientY);
    lastTapRef.current = { time: now, clientX: e.clientX, clientY: e.clientY };

    if (dt < 290 && dist < 28 && opts.tool !== 'pan') {
      opts.currentStrokeRef.current = null; opts.triggerBucketFill(e.clientX, e.clientY); return;
    }
    if (opts.tool === 'pan' || e.button === 1 || e.button === 2 || opts.spacePressedRef.current) {
      isPanningRef.current = true;
      panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: opts.panRef.current.x, panY: opts.panRef.current.y };
      return;
    }
    if (opts.tool === 'bucket') { opts.triggerBucketFill(e.clientX, e.clientY); return; }

    const pt = opts.clientToWorldNorm(e.clientX, e.clientY);
    if (opts.tool === 'eyedropper') {
      const hex = pickEyedropperColor(opts.worldCanvasRef.current, pt);
      if (hex) { opts.setColor(hex); opts.setTool('pen'); }
      return;
    }
    const stroke: StudioStroke = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: opts.authorKey, tool: opts.tool, color: opts.color, size: opts.size,
      opacity: 1, points: [pt], filled: opts.filledShape,
    };
    opts.currentStrokeRef.current = stroke;
    opts.renderViewport();
    opts.onEmitStudio({ t: 'studio', action: 'live', stroke });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      updateTwoFingerGesture(activePointersRef.current, opts.panRef, opts.zoomRef, panStartRef, pinchDistRef, opts.setPan, opts.setZoom);
      opts.renderViewport(); return;
    }
    if (isPanningRef.current) {
      const nextPan = { x: panStartRef.current.panX + (e.clientX - panStartRef.current.clientX), y: panStartRef.current.panY + (e.clientY - panStartRef.current.clientY) };
      opts.panRef.current = nextPan; opts.setPan(nextPan); opts.renderViewport(); return;
    }
    const pt = opts.clientToWorldNorm(e.clientX, e.clientY), now = performance.now();
    if (now - lastLiveEmitRef.current > 45) opts.onEmitStudio({ t: 'studio', action: 'cursor', cursor: { x: pt.x, y: pt.y, color: opts.color, tool: opts.tool }, name: opts.myName });
    const cur = opts.currentStrokeRef.current;
    if (!cur) return;
    if (['line', 'rect', 'circle', 'heart', 'star'].includes(cur.tool)) cur.points = [cur.points[0], pt];
    else cur.points.push(pt);
    opts.renderViewport();
    if (now - lastLiveEmitRef.current > 28) { lastLiveEmitRef.current = now; opts.onEmitStudio({ t: 'studio', action: 'live', stroke: cur }); }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchDistRef.current = null;
    if (isPanningRef.current && activePointersRef.current.size === 0) { isPanningRef.current = false; return; }
    const cur = opts.currentStrokeRef.current;
    if (!cur) return;
    opts.currentStrokeRef.current = null;
    if (cur.points.length <= 3) opts.lastTapStrokeRef.current = { id: cur.id, time: Date.now() };
    opts.commitStroke(cur);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const nextZoom = Math.max(0.5, Math.min(3.2, Number((opts.zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9)).toFixed(2))));
    opts.zoomRef.current = nextZoom; opts.setZoom(nextZoom); opts.renderViewport();
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel };
}
