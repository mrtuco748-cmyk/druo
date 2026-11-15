import React from 'react';
import { MOVIE_CAPS } from '../../lib/quality';
import { RoomSource } from '../CinemaScreen';

interface Props {
  source: RoomSource | null;
  preferredVersionKey: string | null;
  onSelectVersionKey: (key: string) => void;
  hlsLevels: { index: number; label: string; bitrate: number }[];
  hlsLevel: number;
  onSelectHlsLevel: (lvl: number) => void;
  movieCapBps: number;
  onSelectMovieCap: (bps: number) => void;
}

export const MovieQualitySection: React.FC<Props> = ({
  source, preferredVersionKey, onSelectVersionKey,
  hlsLevels, hlsLevel, onSelectHlsLevel,
  movieCapBps, onSelectMovieCap,
}) => {
  return (
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
          <button type="button" className={`q-chip ${hlsLevel === -1 ? 'active' : ''}`} onClick={() => onSelectHlsLevel(-1)}>
            <strong>Automática</strong><small>Según tu red</small>
          </button>
          {hlsLevels.map((l) => (
            <button
              key={l.index}
              type="button"
              className={`q-chip ${hlsLevel === l.index ? 'active' : ''}`}
              onClick={() => onSelectHlsLevel(l.index)}
            >
              <strong>{l.label}</strong><small>{Math.round(l.bitrate / 1000)} kbps</small>
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
              <strong>{c.label}</strong><small>{c.hint}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
