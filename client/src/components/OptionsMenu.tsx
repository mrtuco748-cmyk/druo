import React from 'react';
import { CamFraming } from './CameraTile';
import {
  IconCamOff,
  IconCamOn,
  IconCinema,
  IconClose,
  IconDucking,
  IconFullscreen,
  IconMicOff,
  IconMicOn,
  IconPen,
  IconResetView,
  IconSliders,
  IconViewCall,
  IconViewCinema,
  IconViewDuo,
  IconViewFocus,
  IconVolume,
} from './KawaiiIcons';

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
  open,
  onClose,
  isMobile,
  viewMode,
  onSelectViewMode,
  onOpenSources,
  drawingActive,
  onToggleDrawing,
  drawingColor,
  onSelectDrawingColor,
  myFraming,
  onToggleMic,
  onToggleCam,
  onChangeFraming,
  peerVolume,
  onChangePeerVolume,
  peerMuted,
  onTogglePeerMuted,
  duckingEnabled,
  onToggleDucking,
  onOpenQuality,
  onToggleFullscreen,
}) => {
  if (!open) return null;

  return (
    <div className="topbar-menu-backdrop" onClick={onClose}>
      <div className="kawaii-options-popover" onClick={(e) => e.stopPropagation()}>
        {/* Botón cerrar circular */}
        <div className="kawaii-opt-top">
          <button type="button" className="kawaii-opt-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {/* 1. Modos de Vista (Solo en PC) */}
        {!isMobile && (
          <div className="kawaii-opt-row">
            <button
              type="button"
              className={`kawaii-opt-icon-btn ${viewMode === 'cinema' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('cinema');
                onClose();
              }}
              aria-label="Cinema View"
            >
              <IconViewCinema size={22} />
            </button>
            <button
              type="button"
              className={`kawaii-opt-icon-btn ${viewMode === 'call-only' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('call-only');
                onClose();
              }}
              aria-label="Call View"
            >
              <IconViewCall size={22} />
            </button>
            <button
              type="button"
              className={`kawaii-opt-icon-btn ${viewMode === 'focus-movie' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('focus-movie');
                onClose();
              }}
              aria-label="Focus View"
            >
              <IconViewFocus size={22} />
            </button>
            <button
              type="button"
              className={`kawaii-opt-icon-btn ${viewMode === 'duo' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('duo');
                onClose();
              }}
              aria-label="Duo View"
            >
              <IconViewDuo size={22} />
            </button>
          </div>
        )}

        {/* 2. Dispositivos, Películas, Auto-Ducking y Pantalla Completa (Solo Iconos SVG) */}
        <div className="kawaii-opt-row">
          <button
            type="button"
            className="kawaii-opt-icon-btn pink"
            onClick={() => {
              onOpenSources();
              onClose();
            }}
            aria-label="Select Movie"
          >
            <IconCinema size={22} />
          </button>

          <button
            type="button"
            className={`kawaii-opt-icon-btn ${myFraming.mic ? 'active' : 'off'}`}
            onClick={onToggleMic}
            aria-label="Toggle Mic"
          >
            {myFraming.mic ? <IconMicOn size={22} /> : <IconMicOff size={22} />}
          </button>

          <button
            type="button"
            className={`kawaii-opt-icon-btn ${myFraming.on ? 'active' : 'off'}`}
            onClick={onToggleCam}
            aria-label="Toggle Camera"
          >
            {myFraming.on ? <IconCamOn size={22} /> : <IconCamOff size={22} />}
          </button>

          <button
            type="button"
            className={`kawaii-opt-icon-btn ${duckingEnabled ? 'active' : ''}`}
            onClick={onToggleDucking}
            aria-label="Auto Ducking"
          >
            <IconDucking size={22} />
          </button>
        </div>

        {/* 3. Dibujo sobre película + Calidad + Pantalla completa (Solo Iconos) */}
        <div className="kawaii-opt-row">
          <button
            type="button"
            className={`kawaii-opt-icon-btn ${drawingActive ? 'active' : ''}`}
            onClick={onToggleDrawing}
            aria-label="Draw on Screen"
          >
            <IconPen size={20} />
          </button>

          <button
            type="button"
            className="kawaii-opt-icon-btn"
            onClick={() => {
              onOpenQuality();
              onClose();
            }}
            aria-label="Quality"
          >
            <IconSliders size={20} />
          </button>

          <button
            type="button"
            className="kawaii-opt-icon-btn"
            onClick={() => {
              onToggleFullscreen();
              onClose();
            }}
            aria-label="Fullscreen"
          >
            <IconFullscreen size={20} />
          </button>
        </div>

        {drawingActive && (
          <div className="kawaii-opt-swatches">
            {['#ff85a2', '#ffe082', '#8ce99a', '#91c9ff', '#ffffff'].map((c) => (
              <button
                key={c}
                type="button"
                className={`kawaii-swatch-dot ${drawingColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => onSelectDrawingColor(c)}
              />
            ))}
          </div>
        )}

        {/* 4. Sliders con Iconos: Volumen de Voz (hasta 400%) y Zoom Cámara */}
        <div className="kawaii-opt-sliders">
          <div className="kawaii-icon-slider">
            <button
              type="button"
              className="kawaii-slider-icon-btn"
              onClick={onTogglePeerMuted}
              aria-label="Mute Peer"
            >
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
      </div>
    </div>
  );
};
