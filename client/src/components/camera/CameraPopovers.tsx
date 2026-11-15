import React from 'react';
import { CamFraming } from './types';

interface Props {
  isMe: boolean;
  label: string;
  showVolPop: boolean;
  peerMuted: boolean;
  peerVolume: number;
  togglePeerMuted: () => void;
  setPeerVolume: (v: number) => void;
  showAdjust: boolean;
  framing: CamFraming;
  zoom: number;
  y: number;
  onChangeFraming?: (next: CamFraming) => void;
}

export const CameraPopovers: React.FC<Props> = ({
  isMe, label, showVolPop, peerMuted, peerVolume, togglePeerMuted, setPeerVolume,
  showAdjust, framing, zoom, y, onChangeFraming,
}) => {
  return (
    <>
      {!isMe && showVolPop && (
        <div className="cam-adjust-pop" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Volumen de {label}</span>
            <button type="button" className="btn-ghost" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={togglePeerMuted}>
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
    </>
  );
};
