import { decideSync, PlaybackState } from '../../lib/sync';

export interface SyncVideoOpts {
  v: HTMLVideoElement;
  playback: PlaybackState;
  now: number;
  effVol: number;
  waitOnBuffer: boolean;
  peerBuffering: boolean;
  someoneSpeaking: boolean;
  lastSpeechAt: number;
  suppressEventsUntil: React.MutableRefObject<number>;
  lastSeekAtRef: React.MutableRefObject<number>;
  hasUserInteractedRef: React.MutableRefObject<boolean>;
  setCurrentPos: (pos: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (b: boolean) => void;
  setAutoplayBlocked: (b: boolean) => void;
  onAutoplayBlockedChange?: (b: boolean) => void;
}

export function syncVideoFrame(opts: SyncVideoOpts) {
  const { v, playback, now, effVol, waitOnBuffer, peerBuffering, someoneSpeaking, lastSpeechAt } = opts;
  if (Math.abs(v.volume - effVol) > 0.015) { try { v.volume = effVol; } catch {} }
  if (effVol > 0 && v.muted && opts.hasUserInteractedRef.current) v.muted = false;
  opts.setCurrentPos(v.currentTime || 0);
  if (v.duration && Number.isFinite(v.duration)) opts.setDuration(v.duration);
  if (v.seeking) return;

  const shouldPlay = playback.playing;
  const dec = decideSync(v.currentTime || 0, { ...playback, playing: shouldPlay }, now);
  const recentlySpoke = someoneSpeaking || Date.now() - lastSpeechAt < 2200;

  if (dec.action === 'seek' && Date.now() - opts.lastSeekAtRef.current > 3500) {
    opts.suppressEventsUntil.current = Date.now() + 1000;
    opts.lastSeekAtRef.current = Date.now();
    v.currentTime = dec.target;
    if (v.playbackRate !== 1) v.playbackRate = 1;
  } else if (dec.action === 'rate' && !recentlySpoke) {
    if (Math.abs(v.playbackRate - dec.rate) > 0.01) v.playbackRate = dec.rate;
  } else if (v.playbackRate !== 1) {
    v.playbackRate = 1;
  }

  if (shouldPlay && v.paused) {
    opts.suppressEventsUntil.current = Date.now() + 1000;
    v.play()
      .then(() => { opts.setAutoplayBlocked(false); opts.onAutoplayBlockedChange?.(false); })
      .catch(() => {
        if (!opts.hasUserInteractedRef.current && (v.currentTime || 0) < 0.5) {
          v.muted = true; v.play().catch(() => {});
          opts.setAutoplayBlocked(true); opts.onAutoplayBlockedChange?.(true);
        }
      });
  } else if (!shouldPlay && !v.paused) {
    opts.suppressEventsUntil.current = Date.now() + 1000;
    v.pause();
  }
  opts.setIsPlaying(!v.paused);
}
