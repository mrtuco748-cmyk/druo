import React from 'react';
import {
  AUDIO_PRESETS,
  AudioPresetId,
  MOVIE_CAPS,
  VIDEO_LADDER,
  VideoPresetId,
} from '../lib/quality';
import { CallStats } from '../lib/rtc';
import { CamFraming } from './CameraTile';
import { RoomSource } from './CinemaScreen';

interface Props {
  open: boolean;
  onClose: () => void;
  source: RoomSource | null;
  preferredVersionKey: string | null;
  onSelectVersionKey: (key: string) => void;
  hlsLevels: { index: number; label: string; bitrate: number }[];
  hlsLevel: number;
  onSelectHlsLevel: (lvl: number) => void;
  movieCapBps: number;
  onSelectMovieCap: (bps: number) => void;
  videoPreset: VideoPresetId;
  onSelectVideoPreset: (id: VideoPresetId) => void;
  audioPreset: AudioPresetId;
  onSelectAudioPreset: (id: AudioPresetId) => void;
  myFraming: CamFraming;
  onChangeFraming: (next: CamFraming) => void;
  duckingEnabled: boolean;
  onToggleDucking: (v: boolean) => void;
  waitOnBuffer: boolean;
  onToggleWaitOnBuffer: (v: boolean) => void;
  stats: CallStats;
  isMobile?: boolean;
  viewMode: 'cinema' | 'call-only' | 'focus-movie' | 'duo';
  onSelectViewMode: (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => void;
}

export const QualityDrawer: React.FC<Props> = ({
  open,
  onClose,
  source,
  preferredVersionKey,
  onSelectVersionKey,
  hlsLevels,
  hlsLevel,
  onSelectHlsLevel,
  movieCapBps,
  onSelectMovieCap,
  videoPreset,
  onSelectVideoPreset,
  audioPreset,
  onSelectAudioPreset,
  myFraming,
  onChangeFraming,
  duckingEnabled,
  onToggleDucking,
  waitOnBuffer,
  onToggleWaitOnBuffer,
  stats,
  isMobile,
  viewMode,
  onSelectViewMode,
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>⚙️ Calidad, vistas y ahorro</h3>
          <button type="button" className="icon-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="stats-strip">
            <span>
              Estado: <strong>{stats.connected ? (stats.viaRelay ? 'Conectados (TURN)' : 'Conectados P2P') : 'Esperando al otro…'}</strong>
            </span>
            <span>Ping: <strong>{stats.rttMs} ms</strong></span>
            <span>Pérdida: <strong>{stats.lossPct}%</strong></span>
            <span>Subida/Bajada llamada: <strong>{stats.outKbps} / {stats.inKbps} kbps</strong></span>
            <span>Tu cámara activa: <strong>{stats.activeVideoLabel} ({stats.resolution})</strong></span>
          </div>

          {/* 0. Modos de vista (Solo en PC) */}
          {!isMobile && (
            <section className="q-section">
              <h4>👁️ Modo de vista de la pantalla</h4>
              <div className="chip-grid">
                <button
                  type="button"
                  className={`q-chip ${viewMode === 'cinema' ? 'active' : ''}`}
                  onClick={() => onSelectViewMode('cinema')}
                >
                  <strong>🎬 Modo Cine</strong>
                  <small>Película al centro, cámaras a los lados</small>
                </button>
                <button
                  type="button"
                  className={`q-chip ${viewMode === 'call-only' ? 'active' : ''}`}
                  onClick={() => onSelectViewMode('call-only')}
                >
                  <strong>💬 Solo Videollamada</strong>
                  <small>Cámaras gigantes cara a cara (sin película)</small>
                </button>
                <button
                  type="button"
                  className={`q-chip ${viewMode === 'focus-movie' ? 'active' : ''}`}
                  onClick={() => onSelectViewMode('focus-movie')}
                >
                  <strong>⛶ Enfoque Película</strong>
                  <small>Película completa, cámaras flotantes</small>
                </button>
                <button
                  type="button"
                  className={`q-chip ${viewMode === 'duo' ? 'active' : ''}`}
                  onClick={() => onSelectViewMode('duo')}
                >
                  <strong>📱 Modo Dúo</strong>
                  <small>Cámaras ampliadas para ver reacciones</small>
                </button>
              </div>
            </section>
          )}

          {/* 1. Calidad de la película en este dispositivo */}
          <section className="q-section">
            <h4>🎞️ Calidad de la película (en tu pantalla)</h4>
            {source?.kind === 'library' && source.versions?.length ? (
              <div className="chip-grid">
                {source.versions.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={`q-chip ${preferredVersionKey === v.key ? 'active' : ''}`}
                    onClick={() => onSelectVersionKey(v.key)}
                  >
                    <strong>{v.quality}</strong>
                    <small>{Math.round((v.size || 0) / (1024 * 1024))} MB</small>
                  </button>
                ))}
              </div>
            ) : hlsLevels.length > 0 ? (
              <div className="chip-grid">
                <button
                  type="button"
                  className={`q-chip ${hlsLevel === -1 ? 'active' : ''}`}
                  onClick={() => onSelectHlsLevel(-1)}
                >
                  <strong>Automática</strong>
                  <small>Según tu red</small>
                </button>
                {hlsLevels.map((l) => (
                  <button
                    key={l.index}
                    type="button"
                    className={`q-chip ${hlsLevel === l.index ? 'active' : ''}`}
                    onClick={() => onSelectHlsLevel(l.index)}
                  >
                    <strong>{l.label}</strong>
                    <small>{Math.round(l.bitrate / 1000)} kbps</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="chip-grid">
                {MOVIE_CAPS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`q-chip ${movieCapBps === c.id ? 'active' : ''}`}
                    onClick={() => onSelectMovieCap(c.id)}
                  >
                    <strong>{c.label}</strong>
                    <small>{c.hint}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 2. Calidad de video de la videollamada */}
          <section className="q-section">
            <h4>📹 Calidad de video de tu cámara (lo que enviás)</h4>
            <div className="chip-grid">
              <button
                type="button"
                className={`q-chip ${videoPreset === 'auto' ? 'active' : ''}`}
                onClick={() => onSelectVideoPreset('auto')}
              >
                <strong>Automática ✨</strong>
                <small>Baja sola si hay lag</small>
              </button>
              {VIDEO_LADDER.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`q-chip ${videoPreset === p.id ? 'active' : ''}`}
                  onClick={() => onSelectVideoPreset(p.id)}
                >
                  <strong>{p.label}</strong>
                  <small>{p.hint}</small>
                </button>
              ))}
            </div>
          </section>

          {/* 3. Calidad de audio de la videollamada */}
          <section className="q-section">
            <h4>🎙️ Calidad de voz (Opus con protección anti-cortes FEC + ahorro en silencio)</h4>
            <div className="chip-grid">
              {(Object.keys(AUDIO_PRESETS) as AudioPresetId[]).map((k) => {
                const a = AUDIO_PRESETS[k];
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`q-chip ${audioPreset === a.id ? 'active' : ''}`}
                    onClick={() => onSelectAudioPreset(a.id)}
                  >
                    <strong>{a.label}</strong>
                    <small>{a.hint}</small>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Encuadre de cara y opciones de convivencia */}
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
                <input
                  type="checkbox"
                  checked={duckingEnabled}
                  onChange={(e) => onToggleDucking(e.target.checked)}
                />
                <span>Bajar suavemente el volumen de la peli cuando alguno habla</span>
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={waitOnBuffer}
                  onChange={(e) => onToggleWaitOnBuffer(e.target.checked)}
                />
                <span>Pausar automáticamente si al otro se le queda cargando el video</span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
