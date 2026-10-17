import React, { useEffect, useRef, useState } from 'react';
import {
  createRemoteVoiceProcessor,
  createSyllableVoiceDetector,
  getSharedAudioContext,
  RemoteVoiceChain,
  resumeSharedAudioContext,
} from '../lib/voiceEngine';

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
  externalSpeaking?: boolean;
  onAudioBlockedChange?: (blocked: boolean) => void;
  peerVolume?: number;
  onChangePeerVolume?: (vol: number) => void;
  peerMuted?: boolean;
  onTogglePeerMuted?: () => void;
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
  externalSpeaking = false,
  onAudioBlockedChange,
  peerVolume: peerVolumeProp,
  onChangePeerVolume,
  peerMuted: peerMutedProp,
  onTogglePeerMuted,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceChainRef = useRef<RemoteVoiceChain | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [localPeerVolume, setLocalPeerVolume] = useState(2.0);
  const [localPeerMuted, setLocalPeerMuted] = useState(false);
  const [showVolPop, setShowVolPop] = useState(false);

  const peerVolume = peerVolumeProp !== undefined ? peerVolumeProp : localPeerVolume;
  const peerMuted = peerMutedProp !== undefined ? peerMutedProp : localPeerMuted;

  const micEnabledRef = useRef(framing.mic !== false);
  micEnabledRef.current = framing.mic !== false;
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;

  const setPeerVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(4, v));
    setLocalPeerVolume(clamped);
    onChangePeerVolume?.(clamped);
  };

  const togglePeerMuted = () => {
    if (onTogglePeerMuted) {
      onTogglePeerMuted();
    } else {
      setLocalPeerMuted((m) => !m);
    }
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Las cámaras siempre van muteadas para evitar acoples y que Android no bloquee el video
    el.muted = true;
    el.defaultMuted = true;
    (el as any).setAttribute('playsinline', 'true');
    (el as any).setAttribute('webkit-playsinline', 'true');
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play().catch((err) => {
        console.warn('[CameraTile] play error:', err);
      });
    }
  }, [stream, framing.on]);

  // Detector inteligente de sílabas y voz humana (ignora clics, roces, respiraciones y ruido de la película)
  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setSpeaking(false);
      onSpeakingChangeRef.current?.(false);
      return;
    }
    const cleanup = createSyllableVoiceDetector({
      stream,
      isMicEnabled: () => micEnabledRef.current,
      onSpeakingChange: (nowSpeaking) => {
        setSpeaking(nowSpeaking);
        onSpeakingChangeRef.current?.(nowSpeaking);
      },
    });
    const resume = () => resumeSharedAudioContext();
    window.addEventListener('click', resume, { passive: true });
    window.addEventListener('touchstart', resume, { passive: true });
    return () => {
      cleanup();
      window.removeEventListener('click', resume);
      window.removeEventListener('touchstart', resume);
    };
  }, [stream]);

  // Si se silencia el mic manualmente, apagar indicador de voz al instante
  useEffect(() => {
    if (framing.mic === false && speaking) {
      setSpeaking(false);
      onSpeakingChangeRef.current?.(false);
    }
  }, [framing.mic, speaking]);

  const zoom = Math.max(1, Math.min(3.5, typeof framing.zoom === 'number' && !isNaN(framing.zoom) ? framing.zoom : 1.0));
  const y = Math.max(-30, Math.min(30, framing.y || 0));
  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled) && framing.on !== false;

  // Cadena de Claridad Vocal Broadcast para el audio remoto (EQ vocal + anti-barro + compresor + boost hasta 400% + limitador)
  useEffect(() => {
    if (isMe) return;
    const el = audioRef.current;
    if (!el) return;
    const aTrack = stream?.getAudioTracks()[0];
    if (!aTrack) {
      el.srcObject = null;
      voiceChainRef.current?.destroy();
      voiceChainRef.current = null;
      setAudioBlocked(false);
      onAudioBlockedChange?.(false);
      return;
    }

    const curStream = el.srcObject as MediaStream | null;
    const curTrack = curStream?.getAudioTracks()[0];
    if (curTrack?.id !== aTrack.id) {
      el.srcObject = new MediaStream([aTrack]);
    }

    voiceChainRef.current?.destroy();
    const initialGain = peerMuted ? 0 : peerVolume;
    const chain = createRemoteVoiceProcessor(aTrack, initialGain);
    voiceChainRef.current = chain;

    const ctx = getSharedAudioContext();

    const syncMuteState = () => {
      if (ctx && ctx.state === 'running' && chain && el) {
        // Silenciar el elemento <audio> nativo cuando la cadena WebAudio está activa para evitar doble audio desfasado
        el.muted = true;
        el.volume = 0;
      } else if (el) {
        el.muted = peerMuted;
        el.volume = Math.max(0, Math.min(1, initialGain));
      }
    };

    if (ctx) {
      ctx.addEventListener?.('statechange', syncMuteState);
      ctx.resume().then(syncMuteState).catch(() => {});
    }
    syncMuteState();

    el.play()
      .then(() => {
        syncMuteState();
        setAudioBlocked(false);
        onAudioBlockedChange?.(false);
      })
      .catch((err) => {
        console.warn('[CameraTile] Audio autoplay blocked:', err);
        setAudioBlocked(true);
        onAudioBlockedChange?.(true);
      });

    const unlockAudio = () => {
      resumeSharedAudioContext();
      syncMuteState();
      el.play()
        .then(() => {
          syncMuteState();
          setAudioBlocked(false);
          onAudioBlockedChange?.(false);
        })
        .catch(() => {});
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      ctx?.removeEventListener?.('statechange', syncMuteState);
      voiceChainRef.current?.destroy();
      voiceChainRef.current = null;
    };
  }, [stream, isMe]);

  useEffect(() => {
    if (isMe) return;
    const targetVol = peerMuted ? 0 : peerVolume;
    if (voiceChainRef.current) {
      voiceChainRef.current.setGain(targetVol);
    }
    const ctx = getSharedAudioContext();
    if (audioRef.current) {
      if (ctx && ctx.state === 'running' && voiceChainRef.current) {
        audioRef.current.muted = true;
        audioRef.current.volume = 0;
      } else {
        audioRef.current.muted = peerMuted;
        audioRef.current.volume = Math.max(0, Math.min(1, targetVol));
      }
    }
  }, [peerVolume, peerMuted, isMe]);

  const handleUnlockAudioClick = () => {
    resumeSharedAudioContext();
    const ctx = getSharedAudioContext();
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        if (ctx && ctx.state === 'running' && voiceChainRef.current && audioRef.current) {
          audioRef.current.muted = true;
          audioRef.current.volume = 0;
        }
        setAudioBlocked(false);
        onAudioBlockedChange?.(false);
      }).catch(() => {});
    }
  };

  return (
    <aside
      className={`cam-slot cam-${side} ${isMe ? 'is-local is-me' : 'is-remote'} ${speaking || externalSpeaking ? 'is-speaking' : ''} ${online ? 'is-online' : 'is-offline'}`}
    >
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
            <span>{online ? (isMe ? 'Tu cámara está pausada' : 'Cámara en pausa') : 'Esperando…'}</span>
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
                onClick={togglePeerMuted}
              >
                {peerMuted ? 'Desmutear' : 'Mutear'}
              </button>
            </div>
            <label>
              <span>Nivel: {peerMuted ? 'Silenciado' : `${Math.round(peerVolume * 100)}% (máx 400%)`}</span>
              <input
                type="range"
                min={0}
                max={4.0}
                step={0.05}
                value={peerMuted ? 0 : peerVolume}
                onChange={(e) => {
                  if (peerMuted) togglePeerMuted();
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
