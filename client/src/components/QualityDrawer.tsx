import React from 'react';
import { AudioPresetId, VideoPresetId } from '../lib/quality';
import { CallStats } from '../lib/rtc';
import { CamFraming } from './CameraTile';
import { RoomSource } from './CinemaScreen';
import { CallQualitySection } from './quality/CallQualitySection';
import { FramingSection } from './quality/FramingSection';
import { MovieQualitySection } from './quality/MovieQualitySection';
import { StatsStrip } from './quality/StatsStrip';
import { ViewModeSection } from './quality/ViewModeSection';

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
  open, onClose, source, preferredVersionKey, onSelectVersionKey,
  hlsLevels, hlsLevel, onSelectHlsLevel, movieCapBps, onSelectMovieCap,
  videoPreset, onSelectVideoPreset, audioPreset, onSelectAudioPreset,
  myFraming, onChangeFraming, duckingEnabled, onToggleDucking,
  waitOnBuffer, onToggleWaitOnBuffer, stats, isMobile, viewMode, onSelectViewMode,
}) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>⚙️ Calidad, vistas y ahorro</h3>
          <button type="button" className="icon-close" onClick={onClose}>✕</button>
        </header>

        <div className="modal-body">
          <StatsStrip stats={stats} />
          {!isMobile && <ViewModeSection viewMode={viewMode} onSelectViewMode={onSelectViewMode} />}
          <MovieQualitySection
            source={source} preferredVersionKey={preferredVersionKey} onSelectVersionKey={onSelectVersionKey}
            hlsLevels={hlsLevels} hlsLevel={hlsLevel} onSelectHlsLevel={onSelectHlsLevel}
            movieCapBps={movieCapBps} onSelectMovieCap={onSelectMovieCap}
          />
          <CallQualitySection
            videoPreset={videoPreset} onSelectVideoPreset={onSelectVideoPreset}
            audioPreset={audioPreset} onSelectAudioPreset={onSelectAudioPreset}
          />
          <FramingSection
            myFraming={myFraming} onChangeFraming={onChangeFraming}
            duckingEnabled={duckingEnabled} onToggleDucking={onToggleDucking}
            waitOnBuffer={waitOnBuffer} onToggleWaitOnBuffer={onToggleWaitOnBuffer}
          />
        </div>
      </div>
    </div>
  );
};
