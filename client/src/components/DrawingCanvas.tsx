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
  action: 'start' | 'move' | 'end' | 'clear';
  stroke?: DrawStroke;
  point?: DrawPoint;
}

interface Props {
  active: boolean;
  color: string;
  width: number;
  onEmitDraw: (ev: DrawEvent) => void;
  incomingEvent: DrawEvent | null;
  onCloseDrawing: () => void;
  onClearDrawing: () => void;
}

export const DrawingCanvas: React.FC<Props> = ({
  active,
  color,
  width,
  onEmitDraw,
  incomingEvent,
  onCloseDrawing,
  onClearDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const currentLocalStroke = useRef<DrawStroke | null>(null);
  const currentRemoteStroke = useRef<DrawStroke | null>(null);

  // Redibujar todo el canvas
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawSingle = (s: DrawStroke) => {
      if (!s.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * (canvas.width / 1000);
      const p0 = s.points[0];
      ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      }
      ctx.stroke();
    };

    strokesRef.current.forEach(drawSingle);
    if (currentLocalStroke.current) drawSingle(currentLocalStroke.current);
    if (currentRemoteStroke.current) drawSingle(currentRemoteStroke.current);
  };

  // Ajustar tamaño del canvas al contenedor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Procesar trazos entrantes del otro usuario en tiempo real
  useEffect(() => {
    if (!incomingEvent) return;
    if (incomingEvent.action === 'start' && incomingEvent.stroke) {
      currentRemoteStroke.current = incomingEvent.stroke;
      redraw();
    } else if (incomingEvent.action === 'move' && incomingEvent.point) {
      if (currentRemoteStroke.current) {
        currentRemoteStroke.current.points.push(incomingEvent.point);
        redraw();
      }
    } else if (incomingEvent.action === 'end') {
      if (currentRemoteStroke.current) {
        strokesRef.current.push(currentRemoteStroke.current);
        currentRemoteStroke.current = null;
        redraw();
      }
    } else if (incomingEvent.action === 'clear') {
      strokesRef.current = [];
      currentRemoteStroke.current = null;
      currentLocalStroke.current = null;
      redraw();
    }
  }, [incomingEvent]);

  // Manejo de eventos touch y mouse locales
  const getNormPos = (e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active) return;
    const pt = getNormPos(e);
    if (!pt) return;
    const stroke: DrawStroke = {
      id: `str-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      color,
      width,
      points: [pt],
    };
    currentLocalStroke.current = stroke;
    onEmitDraw({ t: 'draw', action: 'start', stroke });
    redraw();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active || !currentLocalStroke.current) return;
    const pt = getNormPos(e);
    if (!pt) return;
    currentLocalStroke.current.points.push(pt);
    onEmitDraw({ t: 'draw', action: 'move', point: pt });
    redraw();
  };

  const handleEnd = () => {
    if (!active || !currentLocalStroke.current) return;
    strokesRef.current.push(currentLocalStroke.current);
    currentLocalStroke.current = null;
    onEmitDraw({ t: 'draw', action: 'end' });
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
      {active && (
        <div className="drawing-toolbar" onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '0.8rem', color: '#ffcf6b', fontWeight: 600 }}>✏️ Pizarra</span>
          <button type="button" className="btn-ghost" onClick={handleClear} title="Borrar todos los dibujos">
            🧹 Limpiar
          </button>
          <button type="button" className="cta-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={onCloseDrawing}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
};
