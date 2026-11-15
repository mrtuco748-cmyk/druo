import { useRef, useState } from 'react';
import { StudioBg, StudioStroke, StudioTool } from './types';

export function useStudioState(initialStrokes: StudioStroke[], initialBg: StudioBg) {
  const [tool, setTool] = useState<StudioTool>('pen');
  const [color, setColor] = useState('#ff85a2');
  const [size, setSize] = useState(8);
  const [filledShape, setFilledShape] = useState(false);
  const [bg, setBg] = useState<StudioBg>(initialBg || 'night');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bgMenuOpen, setBgMenuOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [myUndoCount, setMyUndoCount] = useState(0);
  const [myRedoCount, setMyRedoCount] = useState(0);
  const [remoteCursor, setRemoteCursor] = useState<{ x: number; y: number; color: string; name: string } | null>(null);

  const viewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<StudioStroke[]>(initialStrokes || []);
  const myRedoRef = useRef<StudioStroke[]>([]);
  const bgRef = useRef<StudioBg>(initialBg || 'night');
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const currentStrokeRef = useRef<StudioStroke | null>(null);
  const remoteLiveStrokeRef = useRef<StudioStroke | null>(null);
  const spacePressedRef = useRef(false);
  const lastTapStrokeRef = useRef<{ id: string; time: number } | null>(null);

  return {
    tool, setTool, color, setColor, size, setSize, filledShape, setFilledShape,
    bg, setBg, menuOpen, setMenuOpen, bgMenuOpen, setBgMenuOpen, pan, setPan,
    zoom, setZoom, myUndoCount, setMyUndoCount, myRedoCount, setMyRedoCount,
    remoteCursor, setRemoteCursor, viewCanvasRef, worldCanvasRef, strokesRef,
    myRedoRef, bgRef, panRef, zoomRef, currentStrokeRef, remoteLiveStrokeRef,
    spacePressedRef, lastTapStrokeRef,
  };
}
