import React from 'react';
import { IconCircle, IconDownload, IconTrash } from '../KawaiiIcons';
import { renderActiveToolIcon } from './toolIcon';
import { KAWAII_PALETTE, resolveBgColor, StudioBg, StudioTool } from './types';

interface Props {
  tool: StudioTool;
  color: string;
  size: number;
  bg: StudioBg;
  currentBgHex: string;
  filledShape: boolean;
  onSelectTool: (t: StudioTool) => void;
  onSelectColor: (c: string) => void;
  onChangeSize: (s: number) => void;
  onChangeBg: (b: StudioBg) => void;
  onToggleFill: () => void;
  onDownloadPng: () => void;
  onClearAll: () => void;
}

const TOOLS: StudioTool[] = [
  'pen', 'marker', 'neon', 'airbrush', 'bucket', 'eraser',
  'pan', 'line', 'rect', 'circle', 'heart', 'eyedropper',
];
const QUICK_BGS: StudioBg[] = ['night', 'pink', 'white', 'cream', 'pastelPink', 'grid', 'dots'];

export const StudioFabPopover: React.FC<Props> = ({
  tool, color, size, bg, currentBgHex, filledShape,
  onSelectTool, onSelectColor, onChangeSize, onChangeBg,
  onToggleFill, onDownloadPng, onClearAll,
}) => {
  return (
    <div className="kawaii-fab-popover">
      <div className="kawaii-tools-grid">
        {TOOLS.map((tId) => (
          <button key={tId} type="button" className={`kawaii-tool-icon-btn ${tool === tId ? 'active' : ''}`} onClick={() => onSelectTool(tId)}>
            {renderActiveToolIcon(tId, 19)}
          </button>
        ))}
      </div>

      <div className="kawaii-swatches-row">
        <label className="kawaii-custom-color">
          <input type="color" value={color} onChange={(e) => onSelectColor(e.target.value)} />
          <span className="kawaii-color-ring" style={{ background: color }} />
        </label>
        {KAWAII_PALETTE.map((c) => (
          <button
            key={c} type="button"
            className={`kawaii-swatch-dot ${color === c && tool !== 'eraser' ? 'active' : ''}`}
            style={{ background: c }} onClick={() => onSelectColor(c)}
          />
        ))}
      </div>

      <div className="kawaii-slider-row">
        <span className="dot-min" />
        <input type="range" min={2} max={48} step={1} value={size} onChange={(e) => onChangeSize(Number(e.target.value))} />
        <span className="dot-max" />
      </div>

      <div className="kawaii-bottom-actions">
        <div className="kawaii-bg-dots">
          <label className="kawaii-bg-dot custom">
            <input type="color" value={currentBgHex} onChange={(e) => onChangeBg(e.target.value)} />
            <span className="kawaii-bg-dot-fill" style={{ background: currentBgHex }} />
          </label>
          {QUICK_BGS.map((bKey) => (
            <button
              key={bKey} type="button"
              className={`kawaii-bg-dot ${bg === bKey ? 'active' : ''} ${bKey === 'grid' ? 'pattern-grid' : bKey === 'dots' ? 'pattern-dots' : ''}`}
              style={{ backgroundColor: resolveBgColor(bKey) }} onClick={() => onChangeBg(bKey)}
            />
          ))}
        </div>
        <div className="kawaii-util-btns">
          <button type="button" className={`kawaii-tool-icon-btn ${filledShape ? 'active' : ''}`} onClick={onToggleFill}><IconCircle size={18} /></button>
          <button type="button" className="kawaii-tool-icon-btn" onClick={onDownloadPng}><IconDownload size={18} /></button>
          <button type="button" className="kawaii-tool-icon-btn danger" onClick={onClearAll}><IconTrash size={18} /></button>
        </div>
      </div>
    </div>
  );
};
