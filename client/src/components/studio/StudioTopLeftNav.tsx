import React from 'react';
import { IconCanvasBg, IconHand, IconHome, IconResetView } from '../KawaiiIcons';
import { BG_PRESET_LIST, resolveBgColor, StudioBg, StudioTool } from './types';

interface Props {
  tool: StudioTool;
  bg: StudioBg;
  currentBgHex: string;
  bgMenuOpen: boolean;
  isViewMoved: boolean;
  onBackToHub: () => void;
  onTogglePan: () => void;
  onToggleBgMenu: () => void;
  onChangeBg: (nextBg: StudioBg) => void;
  onResetView: () => void;
}

export const StudioTopLeftNav: React.FC<Props> = ({
  tool, bg, currentBgHex, bgMenuOpen, isViewMoved,
  onBackToHub, onTogglePan, onToggleBgMenu, onChangeBg, onResetView,
}) => {
  return (
    <div className="kawaii-floating-top-left">
      <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
        <IconHome size={20} />
      </button>

      <button type="button" className={`kawaii-icon-circle ${tool === 'pan' ? 'active' : ''}`} onClick={onTogglePan} aria-label="Move Canvas">
        <IconHand size={20} />
      </button>

      <div className="kawaii-bg-picker-anchor">
        <button type="button" className={`kawaii-icon-circle kawaii-bg-trigger-btn ${bgMenuOpen ? 'active' : ''}`} onClick={onToggleBgMenu} aria-label="Canvas Background">
          <IconCanvasBg size={19} />
          <span className="kawaii-bg-live-indicator" style={{ background: currentBgHex }} />
        </button>

        {bgMenuOpen && (
          <div className="kawaii-bg-popover">
            <div className="kawaii-bg-grid">
              <label className="kawaii-bg-swatch custom" title="Color personalizado de lienzo">
                <input type="color" value={currentBgHex} onChange={(e) => onChangeBg(e.target.value)} />
                <span className="kawaii-bg-swatch-fill" style={{ background: currentBgHex }} />
                <span className="kawaii-bg-plus">+</span>
              </label>
              {BG_PRESET_LIST.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`kawaii-bg-swatch ${bg === item.id ? 'active' : ''} ${item.pattern ? `pattern-${item.pattern}` : ''}`}
                  style={{ backgroundColor: resolveBgColor(item.id) }}
                  onClick={() => onChangeBg(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {isViewMoved && (
        <button type="button" className="kawaii-icon-circle soft" onClick={onResetView} aria-label="Reset View">
          <IconResetView size={18} />
        </button>
      )}
    </div>
  );
};
