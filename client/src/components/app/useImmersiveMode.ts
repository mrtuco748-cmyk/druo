import { useEffect, useRef, useState } from 'react';

export function useImmersiveMode(mobile: boolean, viewMode: string, setViewMode: (m: any) => void) {
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [immersiveToast, setImmersiveToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);
  const lastTapRef = useRef(0);
  const lastToggleAtRef = useRef(0);

  const toggleImmersiveMode = () => {
    const now = Date.now();
    if (now - lastToggleAtRef.current < 450) return;
    lastToggleAtRef.current = now;
    setImmersiveMode((prev) => {
      const next = !prev;
      clearTimeout(toastTimerRef.current);
      setImmersiveToast(next ? '✨ Modo inmersivo activado · Toca 2 veces para mostrar' : '✨ Interfaz visible');
      toastTimerRef.current = setTimeout(() => setImmersiveToast(null), 2500);
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, .ctrl-btn, .ctrl-timeline-wrap, .cam-slot, .top-btn, .kawaii-options-popover, .modal-card, .drawing-toolbar, .drawing-canvas, a')) {
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 450) { toggleImmersiveMode(); lastTapRef.current = 0; }
    else lastTapRef.current = now;
  };

  useEffect(() => {
    if (mobile && viewMode !== 'cinema') {
      setViewMode('cinema');
      localStorage.setItem('druo.viewMode', 'cinema');
    }
  }, [mobile, viewMode]);

  return { immersiveMode, immersiveToast, handlePointerDown };
}
