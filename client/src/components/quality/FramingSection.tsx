import React from 'react';
import { CamFraming } from '../CameraTile';

interface Props {
  myFraming: CamFraming;
  onChangeFraming: (next: CamFraming) => void;
  duckingEnabled: boolean;
  onToggleDucking: (v: boolean) => void;
  waitOnBuffer: boolean;
  onToggleWaitOnBuffer: (v: boolean) => void;
}

export const FramingSection: React.FC<Props> = ({
  myFraming, onChangeFraming, duckingEnabled, onToggleDucking,
  waitOnBuffer, onToggleWaitOnBuffer,
}) => {
  return (
    <section className="q-section">
      <h4>🔍 Zoom de tu cara y sonido inteligente</h4>
      <div className="slider-row">
        <label>
          <span>Zoom de cámara ({myFraming.zoom.toFixed(1)}×)</span>
          <input
            type="range"
            min={1.0}
            max={3.4}
            step={0.1}
            value={myFraming.zoom}
            onChange={(e) => onChangeFraming({ ...myFraming, zoom: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>Encuadre vertical ({myFraming.y}%)</span>
          <input
            type="range"
            min={-25}
            max={25}
            step={1}
            value={myFraming.y}
            onChange={(e) => onChangeFraming({ ...myFraming, y: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="toggle-row">
        <label className="check-line">
          <input type="checkbox" checked={duckingEnabled} onChange={(e) => onToggleDucking(e.target.checked)} />
          <span>Bajar suavemente el volumen de la peli cuando alguno habla</span>
        </label>
        <label className="check-line">
          <input type="checkbox" checked={waitOnBuffer} onChange={(e) => onToggleWaitOnBuffer(e.target.checked)} />
          <span>Pausar automáticamente si al otro se le queda cargando el video</span>
        </label>
      </div>
    </section>
  );
};
