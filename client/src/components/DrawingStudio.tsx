import React, { useEffect, useRef, useState } from 'react';

export type StudioTool =
  | 'pen'
  | 'marker'
  | 'neon'
  | 'airbrush'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'circle'
  | 'heart'
  | 'star'
  | 'stamp'
  | 'text'
  | 'eyedropper';

export type StudioBg = 'cream' | 'white' | 'pink' | 'night' | 'grid' | 'dots';

export interface StudioPoint {
  x: number;
  y: number;
}

export interface StudioStroke {
  id: string;
  author?: string;
  tool: StudioTool;
  color: string;
  size: number;
  opacity: number;
  points: StudioPoint[];
  text?: string;
  stamp?: string;
  filled?: boolean;
}

export interface StudioEvent {
  t: 'studio';
  action: 'live' | 'commit' | 'remove' | 'replace' | 'bg' | 'clear' | 'cursor' | 'pictionary';
  stroke?: StudioStroke | null;
  strokes?: StudioStroke[];
  id?: string;
  bg?: StudioBg;
  cursor?: { x: number; y: number; color: string; tool: string } | null;
  pictionary?: { active: boolean; drawer: string; word?: string; endsAt?: number } | null;
  from?: string;
  name?: string;
}

interface Props {
  myName: string;
  peerName?: string;
  initialStrokes: StudioStroke[];
  initialBg: StudioBg;
  onEmitStudio: (ev: StudioEvent) => void;
  onRegisterStudioReceiver: (fn: (ev: StudioEvent) => void) => void;
  onSyncLocalState: (strokes: StudioStroke[], bg: StudioBg) => void;
  onBackToHub: () => void;
}

const PALETTE = [
  '#2b2333', // Carbón suave
  '#ffffff', // Blanco puro
  '#ff6b9d', // Rosa chicle cute
  '#e8455b', // Rojo cereza
  '#ff9770', // Durazno coral
  '#ffd166', // Amarillo sol
  '#ffcf6b', // Dorado cálido
  '#63e6be', // Menta pastel
  '#38d9a9', // Esmeralda
  '#74c0fc', // Cielo pastel
  '#4dabf7', // Azul océano
  '#a98bff', // Lavanda cute
  '#da77f2', // Orquídea
  '#f783ac', // Rosa bebé
  '#ffccd5', // Piel / Rubor suave
  '#8d6e63', // Cacao / Marrón
];

const STAMPS = ['💖', '✨', '🌸', '🐱', '🍓', '👑', '🎀', '🥺', '🔥', '🌈', '🍕', '🎬'];

const PICTIONARY_WORDS = [
  'Gatito con sombrero 🐱🎩',
  'Cena romántica con velas 🕯️🍝',
  'Pingüinos dándose la mano 🐧💕',
  'Viaje a la playa juntos 🏖️☀️',
  'Perro manejando un auto 🐶🚗',
  'Castillo flotando en las nubes 🏰☁️',
  'Maratón de películas con pochoclos 🍿🎬',
  'Oso panda comiendo helado 🐼🍦',
  'Astronauta enamorado en la luna 🚀🌙',
  'Desayuno en la cama con flores 🥐🌷',
  'Dragón tirando corazones 🐉💖',
  'Día de lluvia con paraguas ☔🌧️',
  'Rana cantando con micrófono 🐸🎤',
  'Picnic bajo las estrellas 🧺✨',
];

const BG_CONFIG: Record<StudioBg, { label: string; fill: string; isDark: boolean }> = {
  cream: { label: '📜 Crema', fill: '#fdf8f2', isDark: false },
  white: { label: '📄 Blanco', fill: '#ffffff', isDark: false },
  pink: { label: '🌸 Rosa Cute', fill: '#fff0f6', isDark: false },
  night: { label: '🌙 Noche', fill: '#151021', isDark: true },
  grid: { label: '📐 Cuadrícula', fill: '#fbfbfe', isDark: false },
  dots: { label: '⠿ Puntos', fill: '#fcfaf7', isDark: false },
};

export const DrawingStudio: React.FC<Props> = ({
  myName,
  peerName,
  initialStrokes,
  initialBg,
  onEmitStudio,
  onRegisterStudioReceiver,
  onSyncLocalState,
  onBackToHub,
}) => {
  // Todos los hooks al inicio absoluto del componente
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<StudioStroke[]>(initialStrokes || []);
  const redoStackRef = useRef<StudioStroke[]>([]);
  const localStrokeRef = useRef<StudioStroke | null>(null);
  const remoteStrokeRef = useRef<StudioStroke | null>(null);
  const lastEmitRef = useRef<number>(0);
  const lastCursorEmitRef = useRef<number>(0);

  const [tool, setTool] = useState<StudioTool>('pen');
  const [color, setColor] = useState<string>('#ff6b9d');
  const [size, setSize] = useState<number>(8);
  const [opacity, setOpacity] = useState<number>(1);
  const [filledShape, setFilledShape] = useState<boolean>(false);
  const [selectedStamp, setSelectedStamp] = useState<string>('💖');
  const [bg, setBg] = useState<StudioBg>(initialBg || 'cream');
  const [strokeCount, setStrokeCount] = useState<number>((initialStrokes || []).length);
  const [redoCount, setRedoCount] = useState<number>(0);
  const [remoteCursor, setRemoteCursor] = useState<{
    x: number;
    y: number;
    color: string;
    tool: string;
    name: string;
  } | null>(null);
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number; value: string } | null>(null);
  const [pictionary, setPictionary] = useState<{
    active: boolean;
    drawer: string;
    word?: string;
    endsAt?: number;
  } | null>(null);
  const [pictSecondsLeft, setPictSecondsLeft] = useState<number>(0);

  // Temporizador para Pictionary
  useEffect(() => {
    if (!pictionary?.active || !pictionary.endsAt) {
      setPictSecondsLeft(0);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((pictionary.endsAt! - Date.now()) / 1000));
      setPictSecondsLeft(rem);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [pictionary]);

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, currentBg: StudioBg) => {
    const cfg = BG_CONFIG[currentBg] || BG_CONFIG.cream;
    ctx.save();
    ctx.fillStyle = cfg.fill;
    ctx.fillRect(0, 0, w, h);

    if (currentBg === 'grid') {
      ctx.strokeStyle = 'rgba(140, 120, 180, 0.14)';
      ctx.lineWidth = 1;
      const step = Math.max(20, Math.round(w / 48));
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (currentBg === 'dots') {
      ctx.fillStyle = 'rgba(140, 120, 180, 0.25)';
      const step = Math.max(22, Math.round(w / 44));
      for (let x = step; x < w; x += step) {
        for (let y = step; y < h; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  const drawHeartPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) => {
    const w = Math.max(4, Math.abs(rx) * 2);
    const h = Math.max(4, Math.abs(ry) * 2);
    const x = cx - w / 2;
    const y = cy - h / 2;
    const topCurveHeight = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + (h + topCurveHeight) / 2, x + w / 2, y + (h + topCurveHeight) / 1.4, x + w / 2, y + h);
    ctx.bezierCurveTo(x + w / 2, y + (h + topCurveHeight) / 1.4, x + w, y + (h + topCurveHeight) / 2, x + w, y + topCurveHeight);
    ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + topCurveHeight);
    ctx.closePath();
  };

  const drawStarPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rOuter: number) => {
    const spikes = 5;
    const outer = Math.max(4, rOuter);
    const inner = outer * 0.45;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.lineTo(cx, cy - outer);
    ctx.closePath();
  };

  const drawSingleStroke = (
    ctx: CanvasRenderingContext2D,
    s: StudioStroke,
    w: number,
    h: number,
    currentBg: StudioBg
  ) => {
    if (!s || !s.points || s.points.length === 0) return;
    const scaleFactor = w / 1200;
    const scaledSize = Math.max(1.5, s.size * scaleFactor);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scaledSize;

    const bgColor = (BG_CONFIG[currentBg] || BG_CONFIG.cream).fill;
    const strokeColor = s.tool === 'eraser' ? bgColor : s.color;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = s.tool === 'eraser' ? 1 : s.tool === 'marker' ? s.opacity * 0.38 : s.opacity;

    if (s.tool === 'neon') {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = scaledSize * 2.2;
    } else if (s.tool === 'airbrush') {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = scaledSize * 1.4;
      ctx.globalAlpha = s.opacity * 0.65;
    }

    const p0 = s.points[0];
    const x0 = p0.x * w;
    const y0 = p0.y * h;

    if (s.tool === 'stamp' && s.stamp) {
      ctx.font = `${Math.max(18, scaledSize * 3.2)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.stamp, x0, y0);
      ctx.restore();
      return;
    }

    if (s.tool === 'text' && s.text) {
      ctx.font = `600 ${Math.max(14, scaledSize * 2.2)}px 'Inter', sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(s.text, x0, y0);
      ctx.restore();
      return;
    }

    const pLast = s.points[s.points.length - 1];
    const x1 = pLast.x * w;
    const y1 = pLast.y * h;

    if (s.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'rect') {
      const rx = Math.min(x0, x1);
      const ry = Math.min(y0, y1);
      const rw = Math.abs(x1 - x0);
      const rh = Math.abs(y1 - y0);
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(rx, ry, rw, rh, Math.min(12, rw / 4, rh / 4));
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'circle') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'heart') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      drawHeartPath(ctx, cx, cy, rx, ry);
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.tool === 'star') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const r = Math.hypot(x1 - x0, y1 - y0) / 2;
      drawStarPath(ctx, cx, cy, r);
      if (s.filled) ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Trazo libre suavizado con curvas cuadráticas de Bézier (calidad Procreate)
    ctx.beginPath();
    if (s.points.length === 1) {
      ctx.arc(x0, y0, scaledSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.points.length === 2) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else {
      ctx.moveTo(x0, y0);
      for (let i = 1; i < s.points.length - 1; i++) {
        const cx = s.points[i].x * w;
        const cy = s.points[i].y * h;
        const nx = s.points[i + 1].x * w;
        const ny = s.points[i + 1].y * h;
        const midX = (cx + nx) / 2;
        const midY = (cy + ny) / 2;
        ctx.quadraticCurveTo(cx, cy, midX, midY);
      }
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  };

  const renderCanvas = (overrideBg?: StudioBg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const activeBg = overrideBg || bg;

    drawBackground(ctx, w, h, activeBg);
    for (const s of strokesRef.current) {
      drawSingleStroke(ctx, s, w, h, activeBg);
    }
    if (remoteStrokeRef.current) {
      drawSingleStroke(ctx, remoteStrokeRef.current, w, h, activeBg);
    }
    if (localStrokeRef.current) {
      drawSingleStroke(ctx, localStrokeRef.current, w, h, activeBg);
    }
  };

  // Sincronizar con props iniciales cuando entran a la sala
  useEffect(() => {
    strokesRef.current = initialStrokes || [];
    setStrokeCount(strokesRef.current.length);
    setBg(initialBg || 'cream');
    renderCanvas(initialBg || 'cream');
  }, [initialStrokes, initialBg]);

  // Ajustar resolución interna del canvas al tamaño de la ventana
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(1, Math.round(rect.width * dpr));
      const nextH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      renderCanvas();
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [bg]);

  // Receptor de eventos en tiempo real del otro participante
  useEffect(() => {
    onRegisterStudioReceiver((ev: StudioEvent) => {
      if (ev.action === 'cursor') {
        if (ev.cursor) {
          setRemoteCursor({ ...ev.cursor, name: ev.name || peerName || 'Pareja' });
        } else {
          setRemoteCursor(null);
        }
        return;
      }
      if (ev.action === 'live' && ev.stroke) {
        remoteStrokeRef.current = ev.stroke;
        renderCanvas();
        return;
      }
      if (ev.action === 'commit' && ev.stroke) {
        remoteStrokeRef.current = null;
        strokesRef.current = [...strokesRef.current, ev.stroke];
        setStrokeCount(strokesRef.current.length);
        onSyncLocalState(strokesRef.current, bg);
        renderCanvas();
        return;
      }
      if (ev.action === 'remove' && ev.id) {
        strokesRef.current = strokesRef.current.filter((s) => s.id !== ev.id);
        setStrokeCount(strokesRef.current.length);
        onSyncLocalState(strokesRef.current, bg);
        renderCanvas();
        return;
      }
      if (ev.action === 'replace' && Array.isArray(ev.strokes)) {
        strokesRef.current = ev.strokes;
        setStrokeCount(strokesRef.current.length);
        onSyncLocalState(strokesRef.current, bg);
        renderCanvas();
        return;
      }
      if (ev.action === 'bg' && ev.bg) {
        setBg(ev.bg);
        onSyncLocalState(strokesRef.current, ev.bg);
        renderCanvas(ev.bg);
        return;
      }
      if (ev.action === 'clear') {
        remoteStrokeRef.current = null;
        localStrokeRef.current = null;
        strokesRef.current = [];
        redoStackRef.current = [];
        setStrokeCount(0);
        setRedoCount(0);
        onSyncLocalState([], bg);
        renderCanvas();
        return;
      }
      if (ev.action === 'pictionary') {
        setPictionary(ev.pictionary || null);
      }
    });
  }, [bg, peerName]);

  // Atajos de teclado profesionales (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (textPrompt) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const getNormPos = (e: React.PointerEvent<HTMLCanvasElement>): StudioPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1))),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height || 1))),
    };
  };

  const sampleCanvasColor = (pt: StudioPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const px = Math.floor(pt.x * canvas.width);
    const py = Math.floor(pt.y * canvas.height);
    const data = ctx.getImageData(px, py, 1, 1).data;
    const hex = `#${[data[0], data[1], data[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    setColor(hex);
    setTool('pen');
  };

  const commitStroke = (s: StudioStroke) => {
    strokesRef.current = [...strokesRef.current, s];
    redoStackRef.current = [];
    setStrokeCount(strokesRef.current.length);
    setRedoCount(0);
    onSyncLocalState(strokesRef.current, bg);
    renderCanvas();
    onEmitStudio({ t: 'studio', action: 'commit', stroke: s });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = getNormPos(e);

    if (tool === 'eyedropper') {
      sampleCanvasColor(pt);
      return;
    }

    if (tool === 'stamp') {
      commitStroke({
        id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        author: myName,
        tool: 'stamp',
        color,
        size,
        opacity: 1,
        points: [pt],
        stamp: selectedStamp,
      });
      return;
    }

    if (tool === 'text') {
      setTextPrompt({ x: pt.x, y: pt.y, value: '' });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: StudioStroke = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: myName,
      tool,
      color,
      size,
      opacity,
      points: [pt],
      filled: filledShape,
    };
    localStrokeRef.current = stroke;
    renderCanvas();
    onEmitStudio({ t: 'studio', action: 'live', stroke });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormPos(e);
    const now = Date.now();

    if (now - lastCursorEmitRef.current > 45) {
      lastCursorEmitRef.current = now;
      onEmitStudio({
        t: 'studio',
        action: 'cursor',
        cursor: { x: pt.x, y: pt.y, color, tool },
      });
    }

    if (!localStrokeRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const s = localStrokeRef.current;
    if (s.tool === 'line' || s.tool === 'rect' || s.tool === 'circle' || s.tool === 'heart' || s.tool === 'star') {
      s.points = [s.points[0], pt];
    } else {
      const last = s.points[s.points.length - 1];
      if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.0018) return;
      s.points.push(pt);
    }

    renderCanvas();
    if (now - lastEmitRef.current > 32) {
      lastEmitRef.current = now;
      onEmitStudio({ t: 'studio', action: 'live', stroke: s });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!localStrokeRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const done = localStrokeRef.current;
    localStrokeRef.current = null;
    commitStroke(done);
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current[strokesRef.current.length - 1];
    strokesRef.current = strokesRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, popped];
    setStrokeCount(strokesRef.current.length);
    setRedoCount(redoStackRef.current.length);
    onSyncLocalState(strokesRef.current, bg);
    renderCanvas();
    onEmitStudio({ t: 'studio', action: 'remove', id: popped.id });
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const restored = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    strokesRef.current = [...strokesRef.current, restored];
    setStrokeCount(strokesRef.current.length);
    setRedoCount(redoStackRef.current.length);
    onSyncLocalState(strokesRef.current, bg);
    renderCanvas();
    onEmitStudio({ t: 'studio', action: 'commit', stroke: restored });
  };

  const handleChangeBg = (nextBg: StudioBg) => {
    setBg(nextBg);
    onSyncLocalState(strokesRef.current, nextBg);
    renderCanvas(nextBg);
    onEmitStudio({ t: 'studio', action: 'bg', bg: nextBg });
  };

  const handleClearAll = () => {
    strokesRef.current = [];
    redoStackRef.current = [];
    localStrokeRef.current = null;
    remoteStrokeRef.current = null;
    setStrokeCount(0);
    setRedoCount(0);
    onSyncLocalState([], bg);
    renderCanvas();
    onEmitStudio({ t: 'studio', action: 'clear' });
  };

  const handleDownloadPng = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, 1920, 1080, bg);
    for (const s of strokesRef.current) {
      drawSingleStroke(ctx, s, 1920, 1080, bg);
    }
    const url = offscreen.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `druo-dibujo-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const handleStartPictionary = () => {
    const word = PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
    const state = {
      active: true,
      drawer: myName,
      word,
      endsAt: Date.now() + 75_000,
    };
    setPictionary(state);
    onEmitStudio({
      t: 'studio',
      action: 'pictionary',
      pictionary: { active: true, drawer: myName, endsAt: state.endsAt },
    });
  };

  const handleStopPictionary = () => {
    setPictionary(null);
    onEmitStudio({ t: 'studio', action: 'pictionary', pictionary: null });
  };

  return (
    <main className="cinema-stage studio-stage">
      <div className="screen-bezel studio-bezel">
        {/* Barra Superior de Herramientas del Estudio */}
        <div className="studio-topbar">
          <div className="studio-left-group">
            <button type="button" className="studio-home-btn" onClick={onBackToHub} title="Volver al Menú Principal">
              🏠 Menú
            </button>
            <span className="studio-badge-title">🎨 Estudio de Arte en Vivo</span>
          </div>

          {/* Pinceles y Herramientas Principales */}
          <div className="studio-tools-strip">
            {(
              [
                { id: 'pen', icon: '🖊️', label: 'Pluma' },
                { id: 'marker', icon: '🖌️', label: 'Acuarela' },
                { id: 'neon', icon: '✨', label: 'Neón' },
                { id: 'airbrush', icon: '💨', label: 'Suave' },
                { id: 'eraser', icon: '🧽', label: 'Goma' },
                { id: 'line', icon: '╱', label: 'Línea' },
                { id: 'rect', icon: '▭', label: 'Caja' },
                { id: 'circle', icon: '◯', label: 'Círculo' },
                { id: 'heart', icon: '💖', label: 'Corazón' },
                { id: 'star', icon: '⭐', label: 'Estrella' },
                { id: 'text', icon: '🔤', label: 'Texto' },
                { id: 'stamp', icon: '🎀', label: 'Stickers' },
                { id: 'eyedropper', icon: '💉', label: 'Gotero' },
              ] as { id: StudioTool; icon: string; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`studio-tool-btn ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
                title={t.label}
              >
                <span className="st-icon">{t.icon}</span>
                <span className="st-lbl">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Acciones de Historial y Exportar */}
          <div className="studio-actions-group">
            <button
              type="button"
              className="studio-act-btn"
              onClick={handleUndo}
              disabled={strokeCount === 0}
              title="Deshacer (Ctrl+Z)"
            >
              ↩️
            </button>
            <button
              type="button"
              className="studio-act-btn"
              onClick={handleRedo}
              disabled={redoCount === 0}
              title="Rehacer (Ctrl+Y)"
            >
              ↪️
            </button>
            <button
              type="button"
              className="studio-act-btn accent"
              onClick={handleStartPictionary}
              title="Jugar Pictionary (te da una palabra secreta para dibujar)"
            >
              🎲 Pictionary
            </button>
            <button
              type="button"
              className="studio-act-btn"
              onClick={handleDownloadPng}
              title="Guardar dibujo en alta calidad (PNG)"
            >
              📸 Guardar
            </button>
            <button
              type="button"
              className="studio-act-btn danger"
              onClick={handleClearAll}
              title="Limpiar todo el lienzo"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Banner de Pictionary si está activo */}
        {pictionary?.active && (
          <div className="studio-pictionary-banner">
            {pictionary.word ? (
              <span>
                🤫 <strong>¡Te toca dibujar!</strong> Palabra secreta:{' '}
                <strong className="pict-secret-word">{pictionary.word}</strong>
              </span>
            ) : (
              <span>
                🕵️ <strong>¡{pictionary.drawer} está dibujando una palabra secreta!</strong> ¡Adiviná por voz!
              </span>
            )}
            <span className="pict-timer">⏱️ {pictSecondsLeft}s</span>
            <button type="button" className="pict-close-btn" onClick={handleStopPictionary}>
              ✕ Terminar
            </button>
          </div>
        )}

        {/* Área del Lienzo Principal */}
        <div className="studio-canvas-container">
          <canvas
            ref={canvasRef}
            className={`studio-canvas tool-${tool}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() =>
              onEmitStudio({ t: 'studio', action: 'cursor', cursor: null })
            }
          />

          {/* Cursor en vivo del otro participante */}
          {remoteCursor && (
            <div
              className="studio-remote-cursor"
              style={{
                left: `${remoteCursor.x * 100}%`,
                top: `${remoteCursor.y * 100}%`,
                borderColor: remoteCursor.color,
              }}
            >
              <span className="rc-dot" style={{ background: remoteCursor.color }} />
              <span className="rc-tag" style={{ background: remoteCursor.color }}>
                ✏️ {remoteCursor.name}
              </span>
            </div>
          )}

          {/* Input flotante para herramienta de Texto */}
          {textPrompt && (
            <div
              className="studio-text-popover"
              style={{
                left: `${Math.min(75, Math.max(10, textPrompt.x * 100))}%`,
                top: `${Math.min(75, Math.max(10, textPrompt.y * 100))}%`,
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Escribí algo lindo y apretá Enter…"
                value={textPrompt.value}
                onChange={(e) => setTextPrompt({ ...textPrompt, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textPrompt.value.trim()) {
                    commitStroke({
                      id: `st-${Date.now()}`,
                      author: myName,
                      tool: 'text',
                      color,
                      size,
                      opacity: 1,
                      points: [{ x: textPrompt.x, y: textPrompt.y }],
                      text: textPrompt.value.trim(),
                    });
                    setTextPrompt(null);
                  } else if (e.key === 'Escape') {
                    setTextPrompt(null);
                  }
                }}
              />
              <button
                type="button"
                className="studio-text-ok"
                onClick={() => {
                  if (textPrompt.value.trim()) {
                    commitStroke({
                      id: `st-${Date.now()}`,
                      author: myName,
                      tool: 'text',
                      color,
                      size,
                      opacity: 1,
                      points: [{ x: textPrompt.x, y: textPrompt.y }],
                      text: textPrompt.value.trim(),
                    });
                  }
                  setTextPrompt(null);
                }}
              >
                Pegar ✨
              </button>
              <button type="button" className="studio-text-cancel" onClick={() => setTextPrompt(null)}>
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Barra Inferior: Paleta de Colores, Grosor, Opacidad, Stickers y Fondo */}
        <div className="studio-bottombar">
          {/* Paleta de colores + selector libre */}
          <div className="studio-palette-wrap">
            <label className="studio-color-wheel" title="Elegir cualquier color personalizado">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (tool === 'eraser') setTool('pen');
                }}
              />
              <span className="wheel-ring" style={{ background: color }} />
            </label>
            <div className="studio-swatches">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`studio-swatch ${color === c && tool !== 'eraser' ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => {
                    setColor(c);
                    if (tool === 'eraser') setTool('pen');
                  }}
                />
              ))}
            </div>
          </div>

          {/* Selector de Stickers si la herramienta stamp está activa */}
          {tool === 'stamp' && (
            <div className="studio-stamps-bar">
              {STAMPS.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`studio-stamp-chip ${selectedStamp === st ? 'active' : ''}`}
                  onClick={() => setSelectedStamp(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          {/* Opción de Relleno si es una figura geométrica */}
          {(tool === 'rect' || tool === 'circle' || tool === 'heart' || tool === 'star') && (
            <button
              type="button"
              className={`studio-fill-toggle ${filledShape ? 'active' : ''}`}
              onClick={() => setFilledShape((f) => !f)}
            >
              {filledShape ? '🎨 Figura Rellena' : '📐 Solo Contorno'}
            </button>
          )}

          {/* Sliders de Grosor y Opacidad */}
          <div className="studio-sliders-wrap">
            <label className="studio-slider-lbl" title="Grosor del pincel">
              <span>Grosor: {size}px</span>
              <input
                type="range"
                min={2}
                max={54}
                step={1}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
            <label className="studio-slider-lbl" title="Opacidad del trazo">
              <span>Opacidad: {Math.round(opacity * 100)}%</span>
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Selector de Fondo de Hoja */}
          <div className="studio-bg-picker">
            {(Object.keys(BG_CONFIG) as StudioBg[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`studio-bg-chip ${bg === k ? 'active' : ''}`}
                onClick={() => handleChangeBg(k)}
              >
                {BG_CONFIG[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
