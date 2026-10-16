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
  onAudioBlockedChange?: (blocked: boolean) => void;
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
  onAudioBlockedChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Las cámaras siempre van muteadas para evitar acoples y que Android no bloquee el video
    el.muted = true;
    el.defaultMuted = true;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play().catch((err) => {
        console.warn('[CameraTile] play error:', err);
      });
    }
  }, [stream]);

  // Detector de voz liviano (AnalyserNode) para iluminar el borde
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
        const active = avg > 36 && framing.mic !== false;
        if (active) hold = 2;
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [peerVolume, setPeerVolume] = useState(1);
  const [peerMuted, setPeerMuted] = useState(false);
  const [showVolPop, setShowVolPop] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Control de audio remoto: elemento <audio> con playsInline y Web Audio GainNode para boost de hasta 250%
  useEffect(() => {
    if (isMe) return;
    const el = audioRef.current;
    if (!el) return;
    const aTrack = stream?.getAudioTracks()[0];
    if (!aTrack) {
      el.srcObject = null;
      setAudioBlocked(false);
      onAudioBlockedChange?.(false);
      return;
    }

    const curStream = el.srcObject as MediaStream | null;
    const curTrack = curStream?.getAudioTracks()[0];
    if (curTrack?.id !== aTrack.id) {
      el.srcObject = new MediaStream([aTrack]);
      el.play()
        .then(() => {
          setAudioBlocked(false);
          onAudioBlockedChange?.(false);
        })
        .catch((err) => {
          console.warn('[CameraTile] Audio autoplay blocked:', err);
          setAudioBlocked(true);
          onAudioBlockedChange?.(true);
        });
    }

    // Configurar Web Audio para reproducir por el altavoz multimedia y permitir boost
    let srcNode: MediaStreamAudioSourceNode | null = null;
    let gainNode: GainNode | null = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || new AC();
      audioCtxRef.current = ctx;

      srcNode = ctx.createMediaStreamSource(new MediaStream([aTrack]));
      gainNode = ctx.createGain();
      gainNode.gain.value = peerMuted ? 0 : peerVolume;
      gainNodeRef.current = gainNode;

      srcNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (ctx.state === 'running') {
        // Web Audio activo: silenciamos el tag <audio> para que no suene doble
        el.muted = true;
      }

      const unlockAudio = () => {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            if (el) el.muted = true;
          }).catch(() => {});
        }
        el.play().then(() => {
          setAudioBlocked(false);
          onAudioBlockedChange?.(false);
        }).catch(() => {});
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });

      return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        try {
          srcNode?.disconnect();
          gainNode?.disconnect();
        } catch {}
      };
    } catch (e) {
      console.warn('[CameraTile] WebAudio setup error:', e);
    }
  }, [stream, isMe]);

  useEffect(() => {
    if (isMe) return;
    const targetVol = peerMuted ? 0 : peerVolume;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = targetVol;
    }
    if (audioRef.current && (!audioCtxRef.current || audioCtxRef.current.state !== 'running')) {
      audioRef.current.volume = Math.max(0, Math.min(1, targetVol));
    }
  }, [peerVolume, peerMuted, isMe]);

  const handleUnlockAudioClick = () => {
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setAudioBlocked(false);
        onAudioBlockedChange?.(false);
      }).catch(() => {});
    }
  };

  return (
    <aside className={`cam-slot cam-${side} ${speaking ? 'is-speaking' : ''} ${online ? 'is-online' : 'is-offline'}`}>
      {!isMe && (
        <audio ref={audioRef} autoPlay playsInline />
      )}
      <div className="cam-frame">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`cam-video ${isMe ? 'is-mirrored' : ''} ${hasVideo ? '' : 'is-hidden'}`}
          style={{
            transform: `${isMe ? 'scaleX(-1) ' : ''}scale(${zoom.toFixed(2)}) translateY(${y}%)`,
          }}
        />
        {!isMe && audioBlocked && (
          <button
            type="button"
            className="autoplay-banner"
            style={{ top: 'auto', bottom: '48px', fontSize: '0.74rem', padding: '6px 12px', zIndex: 10 }}
            onClick={handleUnlockAudioClick}
          >
            🔊 Tocar para escuchar
          </button>
        )}
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
              <span className="cam-pill muted" title="Micrófono del otro silenciado por él">
                🔇
              </span>
            )}
            {!isMe && (
              <button
                type="button"
                className={`cam-pill btn ${peerMuted ? 'muted' : ''}`}
                onClick={() => setShowVolPop((v) => !v)}
                title="Volumen del otro y silenciar"
              >
                {peerMuted ? '🔇' : peerVolume > 1 ? '🔊+' : '🔊'} {peerMuted ? 'Mudo' : `${Math.round(peerVolume * 100)}%`}
              </button>
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

        {!isMe && showVolPop && (
          <div className="cam-adjust-pop" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Volumen de {label}</span>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                onClick={() => setPeerMuted((m) => !m)}
              >
                {peerMuted ? 'Desmutear' : 'Mutear'}
              </button>
            </div>
            <label>
              <span>Nivel: {peerMuted ? 'Silenciado' : `${Math.round(peerVolume * 100)}%`}</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={peerMuted ? 0 : peerVolume}
                onChange={(e) => {
                  setPeerMuted(false);
                  setPeerVolume(Number(e.target.value));
                }}
              />
            </label>
          </div>
        )}

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
