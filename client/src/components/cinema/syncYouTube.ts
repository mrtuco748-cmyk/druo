import { expectedPosition, PlaybackState } from '../../lib/sync';
import { RoomSource } from './types';

export interface SyncYtOpts {
  p: any;
  source: RoomSource;
  playback: PlaybackState;
  now: number;
  effVol: number;
  duration: number;
  waitOnBuffer: boolean;
  peerBuffering: boolean;
  currentPlaylistIdxRef: React.MutableRefObject<number>;
  suppressEventsUntil: React.MutableRefObject<number>;
  lastSeekAtRef: React.MutableRefObject<number>;
  setPlaylistIdx: (idx: number) => void;
  setCurrentPos: (pos: number) => void;
  setDuration: (d: number) => void;
  jumpToPlaylistIndex: (idx: number, emit?: boolean) => void;
}

export function syncYouTubeFrame(opts: SyncYtOpts) {
  const { p, source, playback, now, effVol, duration, waitOnBuffer, peerBuffering } = opts;
  if (!p || typeof p.getCurrentTime !== 'function') return;
  try { p.setVolume?.(Math.round(effVol * 100)); } catch {}

  const target = expectedPosition(playback, now);
  if (source.playlist?.length && typeof playback.playlistIndex === 'number' &&
    playback.playlistIndex !== opts.currentPlaylistIdxRef.current && source.playlist[playback.playlistIndex]) {
    opts.currentPlaylistIdxRef.current = playback.playlistIndex;
    opts.setPlaylistIdx(playback.playlistIndex);
    opts.suppressEventsUntil.current = Date.now() + 900;
    opts.lastSeekAtRef.current = Date.now();
    p.loadVideoById?.({ videoId: source.playlist[playback.playlistIndex], startSeconds: Math.max(0, target) });
    return;
  }

  const pos = Number(p.getCurrentTime()) || 0;
  const dur = Number(p.getDuration?.()) || duration;
  opts.setCurrentPos(pos);
  if (dur > 0) opts.setDuration(dur);

  if (source.playlist && source.playlist.length > 1 && dur > 3 && pos >= dur - 0.35 &&
    opts.currentPlaylistIdxRef.current + 1 < source.playlist.length) {
    opts.jumpToPlaylistIndex(opts.currentPlaylistIdxRef.current + 1, true);
    return;
  }

  const state = p.getPlayerState?.();
  if (state === 3) return;
  if (Math.abs(target - pos) > 2.2 && Date.now() - opts.lastSeekAtRef.current > 2500) {
    opts.suppressEventsUntil.current = Date.now() + 800;
    opts.lastSeekAtRef.current = Date.now();
    p.seekTo(target, true);
  }
  const shouldPlay = playback.playing && !(waitOnBuffer && peerBuffering);
  if (shouldPlay && state !== 1 && state !== 3) {
    opts.suppressEventsUntil.current = Date.now() + 700; p.playVideo?.();
  } else if (!shouldPlay && state === 1) {
    opts.suppressEventsUntil.current = Date.now() + 700; p.pauseVideo?.();
  }
}
