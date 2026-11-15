import React, { useEffect, useRef, useState } from 'react';
import { redrawCanvas } from './canvas/renderStrokes';
import { DrawEvent, DrawPoint, DrawStroke } from './canvas/types';
import { useCanvasSignaling } from './canvas/useCanvasSignaling';
import { useDrawingInteractions } from './canvas/useDrawingInteractions';

export type { DrawEvent, DrawPoint, DrawStroke };

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
  active, color, width, peerName, initialStrokes,
  onEmitDraw, onRegisterReceiver, onCloseDrawing, onClearDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const currentLocalStroke = useRef<DrawStroke | null>(null);
  const currentRemoteStroke = useRef<DrawStroke | null>(null);
  const [peerDrawing, setPeerDrawing] = useState(false);
  const peerTimerRef = useRef<any>(null);

  const redraw = () => redrawCanvas(canvasRef.current, strokesRef.current, currentLocalStroke.current, currentRemoteStroke.current);

  useEffect(() => {
    if (initialStrokes?.length) { strokesRef.current = [...initialStrokes]; redraw(); }
  }, [initialStrokes]);

  useCanvasSignaling({
    canvasRef, strokesRef, currentRemoteStroke, currentLocalStroke,
    redraw, setPeerDrawing, peerTimerRef, onRegisterReceiver,
  });

  const { handleStart, handleMove, handleEnd } = useDrawingInteractions({
    active, color, width, canvasRef, strokesRef, currentLocalStroke, redraw, onEmitDraw,
  });

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
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
      />
      {peerDrawing && !active && (
        <div className="drawing-indicator"><span>✏️ {peerName || 'Tu pareja'} está dibujando…</span></div>
      )}
      {active && (
        <div className="drawing-toolbar" onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '0.8rem', color: '#ffcf6b', fontWeight: 600 }}>✏️ Pizarra</span>
          <button type="button" className="btn-ghost" onClick={handleClear} title="Borrar todos los dibujos">🧹 Limpiar</button>
          <button type="button" className="cta-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={onCloseDrawing}>Listo</button>
        </div>
      )}
    </div>
  );
};
