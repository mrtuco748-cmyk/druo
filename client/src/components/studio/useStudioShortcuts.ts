import { useEffect } from 'react';

interface Opts {
  viewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  spacePressedRef: React.MutableRefObject<boolean>;
  rebuildWorldCanvas: () => void;
  renderViewport: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useStudioShortcuts({
  viewCanvasRef, spacePressedRef, rebuildWorldCanvas, renderViewport, onUndo, onRedo,
}: Opts) {
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spacePressedRef.current = true;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo(); else onUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spacePressedRef.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  });
}
