import React from 'react';
import { IconClose } from '../KawaiiIcons';
import { StudioFabPopover } from './StudioFabPopover';
import { renderActiveToolIcon } from './toolIcon';
import { StudioBg, StudioTool } from './types';

interface Props {
  menuOpen: boolean;
  tool: StudioTool;
  color: string;
  size: number;
  bg: StudioBg;
  currentBgHex: string;
  filledShape: boolean;
  onToggleMenu: () => void;
  onSelectTool: (t: StudioTool) => void;
  onSelectColor: (c: string) => void;
  onChangeSize: (s: number) => void;
  onChangeBg: (b: StudioBg) => void;
  onToggleFill: () => void;
  onDownloadPng: () => void;
  onClearAll: () => void;
}

export const StudioFabMenu: React.FC<Props> = (props) => {
  return (
    <div className="kawaii-fab-wrapper">
      {props.menuOpen && <StudioFabPopover {...props} />}
      <button
        type="button"
        className={`kawaii-main-fab ${props.menuOpen ? 'open' : ''}`}
        style={{ '--fab-color': props.color } as React.CSSProperties}
        onClick={props.onToggleMenu}
        aria-label="Tools"
      >
        {props.menuOpen ? <IconClose size={24} /> : renderActiveToolIcon(props.tool, 24)}
      </button>
    </div>
  );
};
