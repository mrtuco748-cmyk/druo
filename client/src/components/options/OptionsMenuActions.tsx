import React from 'react';
import { CamFraming } from '../CameraTile';
import {
  IconCamOff, IconCamOn, IconCinema, IconDucking,
  IconFullscreen, IconMicOff, IconMicOn, IconPen, IconSliders,
} from '../KawaiiIcons';

interface Props {
  onOpenSources: () => void;
  myFraming: CamFraming;
  onToggleMic: () => void;
  onToggleCam: () => void;
  duckingEnabled: boolean;
  onToggleDucking: () => void;
  drawingActive: boolean;
  onToggleDrawing: () => void;
  drawingColor: string;
  onSelectDrawingColor: (c: string) => void;
  onOpenQuality: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

const SWATCHES = ['#ff85a2', '#ffe082', '#8ce99a', '#91c9ff', '#ffffff'];

export const OptionsMenuActions: React.FC<Props> = ({
  onOpenSources, myFraming, onToggleMic, onToggleCam, duckingEnabled,
  onToggleDucking, drawingActive, onToggleDrawing, drawingColor,
  onSelectDrawingColor, onOpenQuality, onToggleFullscreen, onClose,
}) => {
  return (
    <>
      <div className="kawaii-opt-row">
        <button type="button" className="kawaii-opt-icon-btn pink" onClick={() => { onOpenSources(); onClose(); }} aria-label="Select Movie">
          <IconCinema size={22} />
        </button>
        <button type="button" className={`kawaii-opt-icon-btn ${myFraming.mic ? 'active' : 'off'}`} onClick={onToggleMic} aria-label="Toggle Mic">
          {myFraming.mic ? <IconMicOn size={22} /> : <IconMicOff size={22} />}
        </button>
        <button type="button" className={`kawaii-opt-icon-btn ${myFraming.on ? 'active' : 'off'}`} onClick={onToggleCam} aria-label="Toggle Camera">
          {myFraming.on ? <IconCamOn size={22} /> : <IconCamOff size={22} />}
        </button>
        <button type="button" className={`kawaii-opt-icon-btn ${duckingEnabled ? 'active' : ''}`} onClick={onToggleDucking} aria-label="Auto Ducking">
          <IconDucking size={22} />
        </button>
      </div>

      <div className="kawaii-opt-row">
        <button type="button" className={`kawaii-opt-icon-btn ${drawingActive ? 'active' : ''}`} onClick={onToggleDrawing} aria-label="Draw on Screen">
          <IconPen size={20} />
        </button>
        <button type="button" className="kawaii-opt-icon-btn" onClick={() => { onOpenQuality(); onClose(); }} aria-label="Quality">
          <IconSliders size={20} />
        </button>
        <button type="button" className="kawaii-opt-icon-btn" onClick={() => { onToggleFullscreen(); onClose(); }} aria-label="Fullscreen">
          <IconFullscreen size={20} />
        </button>
      </div>

      {drawingActive && (
        <div className="kawaii-opt-swatches">
          {SWATCHES.map((c) => (
            <button key={c} type="button" className={`kawaii-swatch-dot ${drawingColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => onSelectDrawingColor(c)} />
          ))}
        </div>
      )}
    </>
  );
};
