import React from 'react';
import {
  IconCinemaFullscreen, IconCinemaVolume, IconPlaylistNav,
  IconPlayPause, IconSeek10,
} from './CinemaControlIcons';
import { CinemaTimeline } from './CinemaTimeline';
import { fmtTime, RoomSource } from './types';

interface Props {
  source: RoomSource;
  playing: boolean;
  currentPos: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  bufferedPct: number;
  playlistIdx: number;
  isScrubbing: boolean;
  scrubPos: number;
  setIsScrubbing: (b: boolean) => void;
  setScrubPos: (p: number) => void;
  onTogglePlay: () => void;
  onSeekTo: (pos: number) => void;
  onJumpPlaylist: (idx: number) => void;
  onToggleMute: () => void;
  onChangeVolume: (v: number) => void;
  onToggleFullscreen: () => void;
}

export const CinemaControls: React.FC<Props> = ({
  source, playing, currentPos, duration, volume, isFullscreen, bufferedPct, playlistIdx,
  isScrubbing, scrubPos, setIsScrubbing, setScrubPos,
  onTogglePlay, onSeekTo, onJumpPlaylist, onToggleMute, onChangeVolume, onToggleFullscreen,
}) => {
  const displayPos = isScrubbing ? scrubPos : currentPos;

  return (
    <div className="cinema-controls" onClick={(e) => e.stopPropagation()}>
      <button
        type="button" className="ctrl-btn ctrl-play-btn" onClick={onTogglePlay}
        title={playing ? 'Pausar para ambos (Espacio)' : 'Reproducir para ambos (Espacio)'}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        <IconPlayPause playing={playing} />
      </button>

      <button type="button" className="ctrl-btn" onClick={() => onSeekTo(currentPos - 10)} title="Retroceder 10 segundos (←)">
        <IconSeek10 dir="back" />
      </button>
      <button type="button" className="ctrl-btn" onClick={() => onSeekTo(currentPos + 10)} title="Adelantar 10 segundos (→)">
        <IconSeek10 dir="fwd" />
      </button>

      {source.playlist && source.playlist.length > 1 && (
        <>
          <button type="button" className="ctrl-btn" disabled={playlistIdx <= 0} onClick={() => onJumpPlaylist(playlistIdx - 1)}>
            <IconPlaylistNav dir="prev" />
          </button>
          <span className="ctrl-time">{playlistIdx + 1}/{source.playlist.length}</span>
          <button type="button" className="ctrl-btn" disabled={playlistIdx >= source.playlist.length - 1} onClick={() => onJumpPlaylist(playlistIdx + 1)}>
            <IconPlaylistNav dir="next" />
          </button>
        </>
      )}

      <CinemaTimeline
        duration={duration} displayPos={displayPos} bufferedPct={bufferedPct}
        isScrubbing={isScrubbing} setIsScrubbing={setIsScrubbing}
        setScrubPos={setScrubPos} scrubPos={scrubPos} onSeekTo={onSeekTo}
      />

      <span className="ctrl-time">{fmtTime(displayPos)} <span className="ctrl-time-sep">/</span> {fmtTime(duration)}</span>

      <div className="ctrl-vol-wrap">
        <button type="button" className="ctrl-btn ctrl-vol-btn" onClick={onToggleMute} title={volume === 0 ? 'Activar sonido (M)' : 'Silenciar (M)'}>
          <IconCinemaVolume volume={volume} />
        </button>
        <input
          type="range" className="ctrl-vol" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => onChangeVolume(Number(e.target.value))} title={`Volumen: ${Math.round(volume * 100)}%`}
        />
      </div>

      <button type="button" className="ctrl-btn ctrl-fs-btn" onClick={onToggleFullscreen} title={isFullscreen ? 'Salir (F)' : 'Pantalla completa (F)'}>
        <IconCinemaFullscreen active={isFullscreen} />
      </button>
    </div>
  );
};
