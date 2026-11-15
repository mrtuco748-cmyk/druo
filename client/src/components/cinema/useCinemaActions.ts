import { PlaybackState } from '../../lib/sync';
import { RoomSource } from './types';

interface Opts {
  source: RoomSource | null;
  playback: PlaybackState;
  currentPos: number;
  duration: number;
  volume: number;
  prevVol: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ytPlayerRef: React.MutableRefObject<any>;
  suppressEventsUntil: React.MutableRefObject<number>;
  lastSeekAtRef: React.MutableRefObject<number>;
  currentPlaylistIdxRef: React.MutableRefObject<number>;
  hasUserInteractedRef: React.MutableRefObject<boolean>;
  setCurrentPos: (pos: number) => void;
  setVolume: (v: number) => void;
  setPrevVol: (v: number) => void;
  onEmitSync: (s: { playing: boolean; position: number; playlistIndex?: number }, reason: string) => void;
}

export function createCinemaActions(opts: Opts) {
  const togglePlay = () => {
    opts.hasUserInteractedRef.current = true;
    const nextPlaying = !opts.playback.playing;
    let pos = opts.currentPos;
    if (opts.source?.kind === 'youtube' && opts.ytPlayerRef.current?.getCurrentTime) pos = opts.ytPlayerRef.current.getCurrentTime() || 0;
    else if (opts.videoRef.current) pos = opts.videoRef.current.currentTime || 0;
    opts.suppressEventsUntil.current = Date.now() + 600;
    if (opts.videoRef.current) {
      if (nextPlaying) { opts.videoRef.current.muted = false; opts.videoRef.current.play().catch(() => {}); }
      else opts.videoRef.current.pause();
    }
    if (opts.ytPlayerRef.current) {
      if (nextPlaying) { try { opts.ytPlayerRef.current.unMute?.(); } catch {} opts.ytPlayerRef.current.playVideo?.(); }
      else opts.ytPlayerRef.current.pauseVideo?.();
    }
    opts.onEmitSync({ playing: nextPlaying, position: pos, playlistIndex: opts.currentPlaylistIdxRef.current }, nextPlaying ? 'play' : 'pause');
  };

  const seekTo = (pos: number) => {
    const clamped = Math.max(0, Math.min(opts.duration || Infinity, pos));
    opts.suppressEventsUntil.current = Date.now() + 700;
    opts.lastSeekAtRef.current = Date.now();
    if (opts.videoRef.current) {
      opts.videoRef.current.currentTime = clamped;
      if (opts.volume > 0) opts.videoRef.current.muted = false;
    }
    if (opts.ytPlayerRef.current?.seekTo) opts.ytPlayerRef.current.seekTo(clamped, true);
    opts.setCurrentPos(clamped);
    opts.onEmitSync({ playing: opts.playback.playing, position: clamped, playlistIndex: opts.currentPlaylistIdxRef.current }, 'seek');
  };

  const toggleMute = () => {
    if (opts.volume > 0) {
      opts.setPrevVol(opts.volume); opts.setVolume(0);
      if (opts.videoRef.current) opts.videoRef.current.muted = true;
    } else {
      opts.setVolume(opts.prevVol > 0 ? opts.prevVol : 1);
      if (opts.videoRef.current) opts.videoRef.current.muted = false;
    }
  };

  return { togglePlay, seekTo, toggleMute };
}
