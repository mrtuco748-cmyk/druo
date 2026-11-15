import React from 'react';
import { AUDIO_PRESETS, AudioPresetId, VIDEO_LADDER, VideoPresetId } from '../../lib/quality';

interface Props {
  videoPreset: VideoPresetId;
  onSelectVideoPreset: (id: VideoPresetId) => void;
  audioPreset: AudioPresetId;
  onSelectAudioPreset: (id: AudioPresetId) => void;
}

export const CallQualitySection: React.FC<Props> = ({
  videoPreset, onSelectVideoPreset, audioPreset, onSelectAudioPreset,
}) => {
  return (
    <>
      <section className="q-section">
        <h4>📹 Calidad de video de tu cámara (lo que enviás)</h4>
        <div className="chip-grid">
          <button type="button" className={`q-chip ${videoPreset === 'auto' ? 'active' : ''}`} onClick={() => onSelectVideoPreset('auto')}>
            <strong>Automática ✨</strong><small>Baja sola si hay lag</small>
          </button>
          {VIDEO_LADDER.map((p) => (
            <button key={p.id} type="button" className={`q-chip ${videoPreset === p.id ? 'active' : ''}`} onClick={() => onSelectVideoPreset(p.id)}>
              <strong>{p.label}</strong><small>{p.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="q-section">
        <h4>🎙️ Calidad de voz (Opus con protección anti-cortes FEC + ahorro en silencio)</h4>
        <div className="chip-grid">
          {(Object.keys(AUDIO_PRESETS) as AudioPresetId[]).map((k) => {
            const a = AUDIO_PRESETS[k];
            return (
              <button key={a.id} type="button" className={`q-chip ${audioPreset === a.id ? 'active' : ''}`} onClick={() => onSelectAudioPreset(a.id)}>
                <strong>{a.label}</strong><small>{a.hint}</small>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
};
