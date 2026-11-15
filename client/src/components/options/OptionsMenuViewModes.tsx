import React from 'react';
import { IconViewCall, IconViewCinema, IconViewDuo, IconViewFocus } from '../KawaiiIcons';

interface Props {
  viewMode: 'cinema' | 'call-only' | 'focus-movie' | 'duo';
  onSelectViewMode: (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => void;
  onClose: () => void;
}

export const OptionsMenuViewModes: React.FC<Props> = ({ viewMode, onSelectViewMode, onClose }) => {
  const select = (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => {
    onSelectViewMode(mode);
    onClose();
  };

  return (
    <div className="kawaii-opt-row">
      <button type="button" className={`kawaii-opt-icon-btn ${viewMode === 'cinema' ? 'active' : ''}`} onClick={() => select('cinema')} aria-label="Cinema View">
        <IconViewCinema size={22} />
      </button>
      <button type="button" className={`kawaii-opt-icon-btn ${viewMode === 'call-only' ? 'active' : ''}`} onClick={() => select('call-only')} aria-label="Call View">
        <IconViewCall size={22} />
      </button>
      <button type="button" className={`kawaii-opt-icon-btn ${viewMode === 'focus-movie' ? 'active' : ''}`} onClick={() => select('focus-movie')} aria-label="Focus View">
        <IconViewFocus size={22} />
      </button>
      <button type="button" className={`kawaii-opt-icon-btn ${viewMode === 'duo' ? 'active' : ''}`} onClick={() => select('duo')} aria-label="Duo View">
        <IconViewDuo size={22} />
      </button>
    </div>
  );
};
