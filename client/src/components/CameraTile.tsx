import React, { useEffect, useRef, useState } from 'react';

export interface CamFraming {
  zoom: number; // 1.0 .. 3.5 (por defecto 2.1 para encuadrar bien la cara)
  y: number;    // -30 .. 30 (% desplazamiento vertical)
  on: boolean;
  mic: boolean;
}

interface Props {
  side: 'left' | 'right';
  label: string;
  isMe: boolean;
  online: boolean;
  stream: MediaStream | null;
  framing: CamFraming;
  onChangeFraming?: (next: CamFraming) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export const CameraTile: React.FC<Props> = ({
  side,
  label,
  isMe,
  online,
  stream,
  framing,
  onChangeFraming,
  onSpeakingChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
      if (stream) el.play().catch(() => {});
    }
  }, [stream, stream?.getTracks().length]);

  // Detector de voz liviano (AnalyserNode) para iluminar el borde y bajar un poquito la peli (ducking)
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setSpeaking(false);
      onSpeakingChange?.(false);
      return;
    }
    let ctx: AudioContext | null = null;
    let timer: any = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let hold = 0;
      timer = setInterval(() => {
        if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 2; i < 28; i++) sum += buf[i];
        const avg = sum / 26;
        const active = avg > 22 && framing.mic !== false;
        if (active) hold = 3;
        else if (hold > 0) hold -= 1;
        const nowSpeaking = hold > 0;
        setSpeaking((prev) => {
          if (prev !== nowSpeaking) onSpeakingChange?.(nowSpeaking);
          return nowSpeaking;
        });
      }, 160);
    } catch {}
    return () => {
      clearInterval(timer);
      try {
        ctx?.close();
      } catch {}
    };
  }, [stream, framing.mic]);

  const zoom = Math.max(1, Math.min(3.5, framing.zoom || 2.1));
  const y = Math.max(-30, Math.min(30, framing.y || 0));
  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled) && framing.on !== false;

  return (
    <aside className={`cam-slot cam-${side} ${speaking ? 'is-speaking' : ''} ${online ? 'is-online' : 'is-offline'}`}>
      <div className="cam-frame">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}
          className={`cam-video ${isMe ? 'is-mirrored' : ''} ${hasVideo ? '' : 'is-hidden'}`}
          style={{
            transform: `${isMe ? 'scaleX(-1) ' : ''}scale(${zoom.toFixed(2)}) translateY(${y}%)`,
          }}
        />
        {!hasVideo && (
          <div className="cam-placeholder">
            <div className="cam-avatar">{label.slice(0, 1).toUpperCase()}</div>
            <span>{online ? 'Cámara en pausa' : 'Esperando…'}</span>
          </div>
        )}

        <div className="cam-vignette" />

        <div className="cam-badge-row">
          <span className="cam-name">
            <span className={`cam-dot ${online ? 'on' : ''}`} />
            {label}
          </span>
          <div className="cam-icons">
            {framing.mic === false && (
              <span className="cam-pill muted" title="Micrófono silenciado">
                🔇
              </span>
            )}
            {isMe && onChangeFraming && (
              <button
                type="button"
                className="cam-pill btn"
                onClick={() => setShowAdjust((v) => !v)}
                title="Ajustar zoom y encuadre de tu cara"
              >
                🔍 {zoom.toFixed(1)}×
              </button>
            )}
          </div>
        </div>

        {isMe && showAdjust && onChangeFraming && (
          <div className="cam-adjust-pop" onClick={(e) => e.stopPropagation()}>
            <label>
              <span>Zoom cara ({zoom.toFixed(1)}×)</span>
              <input
                type="range"
                min={1.1}
                max={3.4}
                step={0.1}
                value={zoom}
                onChange={(e) => onChangeFraming({ ...framing, zoom: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>Altura ({y > 0 ? `+${y}` : y}%)</span>
              <input
                type="range"
                min={-25}
                max={25}
                step={1}
                value={y}
                onChange={(e) => onChangeFraming({ ...framing, y: Number(e.target.value) })}
              />
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};
