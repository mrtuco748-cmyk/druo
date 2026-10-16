import React from 'react';
import { CamFraming } from './CameraTile';

interface Props {
  open: boolean;
  onClose: () => void;
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
  onOpenQuality: () => void;
  onToggleFullscreen: () => void;
}

export const OptionsMenu: React.FC<Props> = ({
  open,
  onClose,
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
  onOpenQuality,
  onToggleFullscreen,
}) => {
  if (!open) return null;

  return (
    <div className="topbar-menu-backdrop" onClick={onClose}>
      <div className="topbar-dropdown-menu" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del menú */}
        <div className="dropdown-header">
          <span className="dropdown-title">⚙️ Panel de Opciones</span>
          <button type="button" className="dropdown-close-btn" onClick={onClose} title="Cerrar menú">
            ✕
          </button>
        </div>

        {/* 1. Selector de Modos de Vista */}
        <div className="dropdown-section">
          <div className="dropdown-section-label">🎭 Modo de Vista</div>
          <div className="dropdown-modes-grid">
            <button
              type="button"
              className={`dropdown-mode-card ${viewMode === 'cinema' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('cinema');
                onClose();
              }}
            >
              <span className="mode-emoji">🎬</span>
              <div className="mode-text">
                <strong>Modo Cine</strong>
                <small>Película central + cámaras</small>
              </div>
            </button>

            <button
              type="button"
              className={`dropdown-mode-card ${viewMode === 'call-only' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('call-only');
                onClose();
              }}
            >
              <span className="mode-emoji">💬</span>
              <div className="mode-text">
                <strong>Solo Llamada</strong>
                <small>Pantalla completa cara a cara</small>
              </div>
            </button>

            <button
              type="button"
              className={`dropdown-mode-card ${viewMode === 'focus-movie' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('focus-movie');
                onClose();
              }}
            >
              <span className="mode-emoji">⛶</span>
              <div className="mode-text">
                <strong>Enfoque</strong>
                <small>Cine gigante + PIP flotante</small>
              </div>
            </button>

            <button
              type="button"
              className={`dropdown-mode-card ${viewMode === 'duo' ? 'active' : ''}`}
              onClick={() => {
                onSelectViewMode('duo');
                onClose();
              }}
            >
              <span className="mode-emoji">👥</span>
              <div className="mode-text">
                <strong>Modo Dúo</strong>
                <small>Cámaras ampliadas</small>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Películas y Contenido */}
        <div className="dropdown-section">
          <div className="dropdown-section-label">🍿 Película & Pantalla</div>
          <button
            type="button"
            className="dropdown-action-row accent"
            onClick={() => {
              onOpenSources();
              onClose();
            }}
          >
            <span>🎬 Elegir Película / Link Cuevana</span>
            <span className="row-chevron">›</span>
          </button>

          {/* Dibujo sobre pantalla */}
          <div className="dropdown-draw-box">
            <div className="draw-toggle-row">
              <span>✏️ Dibujar sobre la pantalla:</span>
              <button
                type="button"
                className={`draw-switch-btn ${drawingActive ? 'on' : 'off'}`}
                onClick={onToggleDrawing}
              >
                {drawingActive ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            {drawingActive && (
              <div className="draw-palette-row">
                <span className="palette-label">Color:</span>
                <div className="palette-dots">
                  {['#ffcf6b', '#e8455b', '#4cd97b', '#4aa3df', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`palette-dot ${drawingColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => onSelectDrawingColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Dispositivos y Encuadre */}
        <div className="dropdown-section">
          <div className="dropdown-section-label">🎙️ Tu Cámara y Micrófono</div>
          <div className="dropdown-device-buttons">
            <button
              type="button"
              className={`device-btn ${myFraming.mic ? 'active' : 'is-off'}`}
              onClick={onToggleMic}
            >
              {myFraming.mic ? '🎙️ Mic: Activo' : '🔇 Mic: Silenciado'}
            </button>
            <button
              type="button"
              className={`device-btn ${myFraming.on ? 'active' : 'is-off'}`}
              onClick={onToggleCam}
            >
              {myFraming.on ? '📷 Cámara: Encendida' : '🚫 Cámara: Pausada'}
            </button>
          </div>

          <div className="dropdown-sliders">
            <label className="slider-item">
              <div className="slider-title">
                <span>🔍 Zoom cara</span>
                <strong>{myFraming.zoom.toFixed(1)}×</strong>
              </div>
              <input
                type="range"
                min={1.0}
                max={3.0}
                step={0.1}
                value={myFraming.zoom}
                onChange={(e) => onChangeFraming({ ...myFraming, zoom: Number(e.target.value) })}
              />
            </label>

            <label className="slider-item">
              <div className="slider-title">
                <span>↕️ Altura encuadre</span>
                <strong>{myFraming.y > 0 ? `+${myFraming.y}` : myFraming.y}%</strong>
              </div>
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
        </div>

        {/* 4. Ajustes y Utilidades */}
        <div className="dropdown-footer">
          <button
            type="button"
            className="footer-btn"
            onClick={() => {
              onOpenQuality();
              onClose();
            }}
          >
            ⚙️ Calidad de streaming y Red
          </button>
          <button
            type="button"
            className="footer-btn"
            onClick={() => {
              onToggleFullscreen();
              onClose();
            }}
          >
            ⛶ Pantalla Completa
          </button>
        </div>
      </div>
    </div>
  );
};
