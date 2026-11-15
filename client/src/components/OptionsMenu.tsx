import React from 'react';
import { CamFraming } from './CameraTile';
import { IconClose } from './KawaiiIcons';
import { OptionsMenuActions } from './options/OptionsMenuActions';
import { OptionsMenuSliders } from './options/OptionsMenuSliders';
import { OptionsMenuViewModes } from './options/OptionsMenuViewModes';

interface Props {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
  viewMode: 'cinema' | 'call-only' | 'focus-movie' | 'duo';
  onSelectViewMode: (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => void;
  onOpenSources: () => void;
  drawingActive: boolean;
  onToggleDrawing: () => void;
  drawingColor: string;
  onSelectDrawingColor: (c: string) => void;
  myFraming: CamFraming;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onChangeFraming: (next: CamFraming) => void;
  peerVolume: number;
  onChangePeerVolume: (v: number) => void;
  peerMuted: boolean;
  onTogglePeerMuted: () => void;
  duckingEnabled: boolean;
  onToggleDucking: () => void;
  onOpenQuality: () => void;
  onToggleFullscreen: () => void;
}

export const OptionsMenu: React.FC<Props> = ({
  open, onClose, isMobile, viewMode, onSelectViewMode,
  onOpenSources, drawingActive, onToggleDrawing, drawingColor, onSelectDrawingColor,
  myFraming, onToggleMic, onToggleCam, onChangeFraming,
  peerVolume, onChangePeerVolume, peerMuted, onTogglePeerMuted,
  duckingEnabled, onToggleDucking, onOpenQuality, onToggleFullscreen,
}) => {
  if (!open) return null;

  return (
    <div className="topbar-menu-backdrop" onClick={onClose}>
      <div className="kawaii-options-popover" onClick={(e) => e.stopPropagation()}>
        <div className="kawaii-opt-top">
          <button type="button" className="kawaii-opt-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {!isMobile && <OptionsMenuViewModes viewMode={viewMode} onSelectViewMode={onSelectViewMode} onClose={onClose} />}

        <OptionsMenuActions
          onOpenSources={onOpenSources} myFraming={myFraming} onToggleMic={onToggleMic} onToggleCam={onToggleCam}
          duckingEnabled={duckingEnabled} onToggleDucking={onToggleDucking} drawingActive={drawingActive}
          onToggleDrawing={onToggleDrawing} drawingColor={drawingColor} onSelectDrawingColor={onSelectDrawingColor}
          onOpenQuality={onOpenQuality} onToggleFullscreen={onToggleFullscreen} onClose={onClose}
        />

        <OptionsMenuSliders
          peerVolume={peerVolume} onChangePeerVolume={onChangePeerVolume} peerMuted={peerMuted}
          onTogglePeerMuted={onTogglePeerMuted} myFraming={myFraming} onChangeFraming={onChangeFraming}
        />
      </div>
    </div>
  );
};
