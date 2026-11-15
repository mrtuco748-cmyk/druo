import React from 'react';
import { CamFraming } from '../CameraTile';
import { IconResetView, IconVolume } from '../KawaiiIcons';

interface Props {
  peerVolume: number;
  onChangePeerVolume: (v: number) => void;
  peerMuted: boolean;
  onTogglePeerMuted: () => void;
  myFraming: CamFraming;
  onChangeFraming: (next: CamFraming) => void;
}

export const OptionsMenuSliders: React.FC<Props> = ({
  peerVolume, onChangePeerVolume, peerMuted, onTogglePeerMuted,
  myFraming, onChangeFraming,
}) => {
  return (
    <div className="kawaii-opt-sliders">
      <div className="kawaii-icon-slider">
        <button type="button" className="kawaii-slider-icon-btn" onClick={onTogglePeerMuted} aria-label="Mute Peer">
          <IconVolume size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={4.0}
          step={0.05}
          value={peerMuted ? 0 : peerVolume}
          onChange={(e) => {
            if (peerMuted) onTogglePeerMuted();
            onChangePeerVolume(Number(e.target.value));
          }}
        />
      </div>

      <div className="kawaii-icon-slider">
        <span className="kawaii-slider-icon-btn">
          <IconResetView size={18} />
        </span>
        <input
          type="range"
          min={1.0}
          max={3.0}
          step={0.1}
          value={myFraming.zoom}
          onChange={(e) => onChangeFraming({ ...myFraming, zoom: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};
