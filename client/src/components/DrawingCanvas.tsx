import React, { useEffect, useRef, useState } from 'react';

export interface DrawPoint {
  x: number; // 0..1 normalizado relativo al lienzo
  y: number; // 0..1
}

export interface DrawStroke {
  id: string;
  color: string;
  width: number;
  points: DrawPoint[];
}

export interface DrawEvent {
  t: 'draw';
  action: 'start' | 'move' | 'end' | 'commit' | 'clear';
  stroke?: DrawStroke;
  point?: DrawPoint;
}

interface Props {
  active: boolean;
  color: string;
  width: number;
  peerName?: string;
  initialStrokes?: DrawStroke[];
  onEmitDraw: (ev: DrawEvent) => void;
  onRegisterReceiver?: (receiver: (ev: DrawEvent) => void) => void;
  onCloseDrawing: () => void;
  onClearDrawing: () => void;
}

export const DrawingCanvas: React.FC<Props> = ({
  active,
  color,
  width,
  peerName,
  initialStrokes,
  onEmitDraw,
  onRegisterReceiver,
  onCloseDrawing,
  onClearDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const currentLocalStroke = useRef<DrawStroke | null>(null);
  const currentRemoteStroke = useRef<DrawStroke | null>(null);

  const [peerDrawing, setPeerDrawing] = useState(false);
  const peerTimerRef = useRef<any>(null);
  const lastEmitTime = useRef(0);

  // Redibujar todo el canvas
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawSingle = (s: DrawStroke) => {
      if (!s.points || !s.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color || '#ffcf6b';
      const scale = Math.min(canvas.width, canvas.height) / 450;
      ctx.lineWidth = Math.max(2.5, (s.width || 3.5) * Math.max(0.6, scale));

      const p0 = s.points[0];
      const startX = p0.x * canvas.width;
      const startY = p0.y * canvas.height;
      ctx.moveTo(startX, startY);

      if (s.points.length === 1) {
        ctx.lineTo(startX + 0.1, startY + 0.1);
      } else {
        for (let i = 1; i < s.points.length; i++) {
          const p = s.points[i];
          ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
        }
      }
      ctx.stroke();
    };

    strokesRef.current.forEach(drawSingle);
    if (currentLocalStroke.current) drawSingle(currentLocalStroke.current);
    if (currentRemoteStroke.current) drawSingle(currentRemoteStroke.current);
  };

  // Inicializar trazos si vienen del servidor (welcome snapshot)
  useEffect(() => {
    if (initialStrokes && initialStrokes.length) {
      strokesRef.current = [...initialStrokes];
      redraw();
    }
  }, [initialStrokes]);

  // Ajustar tamaño del canvas al contenedor usando ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          const w = Math.round(cr.width);
          const h = Math.round(cr.height);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            redraw();
          }
        }
      }
    });

    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // Registrar callback directo que saltea el batching de React para trazos en tiempo real instantáneos
  useEffect(() => {
    if (!onRegisterReceiver) return;
    onRegisterReceiver((ev: DrawEvent) => {
      // Activar aviso visual temporal de que la otra persona está dibujando
      setPeerDrawing(true);
      clearTimeout(peerTimerRef.current);
      peerTimerRef.current = setTimeout(() => setPeerDrawing(false), 2400);

      if (ev.action === 'start' && ev.stroke) {
        currentRemoteStroke.current = ev.stroke;
        redraw();
      } else if (ev.action === 'move' && ev.point) {
        if (!currentRemoteStroke.current && ev.stroke) {
          currentRemoteStroke.current = ev.stroke;
        }
        if (currentRemoteStroke.current) {
          currentRemoteStroke.current.points.push(ev.point);
          redraw();
        }
      } else if (ev.action === 'commit' && ev.stroke) {
        const stroke = ev.stroke;
        const idx = strokesRef.current.findIndex((s) => s.id === stroke.id);
        if (idx >= 0) {
          strokesRef.current[idx] = stroke;
        } else {
          strokesRef.current.push(stroke);
        }
        if (currentRemoteStroke.current?.id === stroke.id) {
          currentRemoteStroke.current = null;
        }
        redraw();
      } else if (ev.action === 'end') {
        if (currentRemoteStroke.current) {
          strokesRef.current.push(currentRemoteStroke.current);
          currentRemoteStroke.current = null;
          redraw();
        }
      } else if (ev.action === 'clear') {
        strokesRef.current = [];
        currentRemoteStroke.current = null;
        currentLocalStroke.current = null;
        redraw();
      }
    });
  }, [onRegisterReceiver]);

  // Manejo de eventos touch y mouse locales
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
    const stroke: DrawStroke = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      color,
      width,
      points: [pt],
    };
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

    // Transmitir cada 30 ms para dar animación suave al otro
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
    // Emitir commit autoritativo con todos los puntos del trazo
    onEmitDraw({ t: 'draw', action: 'commit', stroke });
    redraw();
  };

  const handleClear = () => {
    strokesRef.current = [];
    currentLocalStroke.current = null;
    currentRemoteStroke.current = null;
    onEmitDraw({ t: 'draw', action: 'clear' });
    onClearDrawing();
    redraw();
  };

  return (
    <div className={`drawing-overlay ${active ? 'is-active' : 'is-passthrough'}`}>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {peerDrawing && !active && (
        <div className="drawing-indicator">
          <span>✏️ {peerName || 'Tu pareja'} está dibujando…</span>
        </div>
      )}

      {active && (
        <div className="drawing-toolbar" onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '0.8rem', color: '#ffcf6b', fontWeight: 600 }}>✏️ Pizarra</span>
          <button type="button" className="btn-ghost" onClick={handleClear} title="Borrar todos los dibujos">
            🧹 Limpiar
          </button>
          <button
            type="button"
            className="cta-primary"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            onClick={onCloseDrawing}
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
};
