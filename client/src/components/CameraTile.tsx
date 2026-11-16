import React, { useRef, useState } from 'react';
import { CameraPopovers } from './camera/CameraPopovers';
import { CamFraming } from './camera/types';
import { useCameraVideo } from './camera/useCameraVideo';
import { useRemoteAudioProcessor } from './camera/useRemoteAudioProcessor';
import { useSyllableSpeaking } from './camera/useSyllableSpeaking';

export type { CamFraming };

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
  side, label, isMe, online, stream, framing, onChangeFraming,
  onSpeakingChange, externalSpeaking = false, onAudioBlockedChange,
  peerVolume: peerVolumeProp, onChangePeerVolume, peerMuted: peerMutedProp, onTogglePeerMuted,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [localPeerVolume, setLocalPeerVolume] = useState(2.0);
  const [localPeerMuted, setLocalPeerMuted] = useState(false);
  const [showVolPop, setShowVolPop] = useState(false);

  const peerVolume = peerVolumeProp !== undefined ? peerVolumeProp : localPeerVolume;
  const peerMuted = peerMutedProp !== undefined ? peerMutedProp : localPeerMuted;
  const setPeerVolume = (v: number) => { const c = Math.max(0, Math.min(4, v)); setLocalPeerVolume(c); onChangePeerVolume?.(c); };
  const togglePeerMuted = () => (onTogglePeerMuted ? onTogglePeerMuted() : setLocalPeerMuted((m) => !m));

  const speaking = useSyllableSpeaking({ stream, micEnabled: framing.mic !== false, onSpeakingChange });
  const { audioBlocked, unlockAudioManually } = useRemoteAudioProcessor({ isMe, stream, peerVolume, peerMuted, audioRef, onAudioBlockedChange });
  useCameraVideo(videoRef, stream, framing.on !== false);

  const zoom = Math.max(1, Math.min(3.5, typeof framing.zoom === 'number' && !isNaN(framing.zoom) ? framing.zoom : 1.0));
  const y = Math.max(-30, Math.min(30, framing.y || 0));
  const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.enabled) && framing.on !== false;

  return (
    <aside className={`cam-slot cam-${side} ${isMe ? 'is-local is-me' : 'is-remote'} ${speaking || externalSpeaking ? 'is-speaking' : ''} ${online ? 'is-online' : 'is-offline'}`}>
      {!isMe && <audio ref={audioRef} autoPlay playsInline />}
      <div className="cam-frame">
        <video
          ref={videoRef} autoPlay playsInline muted
          className={`cam-video ${isMe ? 'is-mirrored' : ''} ${hasVideo ? '' : 'is-hidden'}`}
          style={{ transform: `${isMe ? 'scaleX(-1) ' : ''}scale(${zoom.toFixed(2)}) translateY(${y}%)` }}
        />
        {!isMe && audioBlocked && (
          <button type="button" className="autoplay-banner" style={{ top: 'auto', bottom: '48px', fontSize: '0.74rem', padding: '6px 12px', zIndex: 10 }} onClick={unlockAudioManually}>
            🔊 Tocar para escuchar
          </button>
        )}
        {!hasVideo && (
          <div className="cam-placeholder">
            <div className="cam-avatar">{label.slice(0, 1).toUpperCase()}</div>
            <span>{online ? (isMe ? 'Tu cámara está pausada' : 'Cámara en pausa') : ''}</span>
          </div>
        )}
        <div className="cam-vignette" />
        <div className="cam-badge-row">
          <span className="cam-name"><span className={`cam-dot ${online ? 'on' : ''}`} />{label}</span>
          <div className="cam-icons">
            {framing.mic === false && <span className="cam-pill muted" title="Micrófono silenciado">🔇</span>}
            {!isMe && (
              <button type="button" className={`cam-pill btn ${peerMuted ? 'muted' : ''}`} onClick={() => setShowVolPop((v) => !v)}>
                {peerMuted ? '🔇' : peerVolume > 1 ? '🔊+' : '🔊'} {peerMuted ? 'Mudo' : `${Math.round(peerVolume * 100)}%`}
              </button>
            )}
            {isMe && onChangeFraming && (
              <button type="button" className="cam-pill btn" onClick={() => setShowAdjust((v) => !v)}>🔍 {zoom.toFixed(1)}×</button>
            )}
          </div>
        </div>
        <CameraPopovers
          isMe={isMe} label={label} showVolPop={showVolPop} peerMuted={peerMuted} peerVolume={peerVolume}
          togglePeerMuted={togglePeerMuted} setPeerVolume={setPeerVolume} showAdjust={showAdjust}
          framing={framing} zoom={zoom} y={y} onChangeFraming={onChangeFraming}
        />
      </div>
    </aside>
  );
};
