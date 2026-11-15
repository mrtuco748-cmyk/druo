import { useEffect } from 'react';
import { PlaybackState } from '../../lib/sync';
import { syncVideoFrame } from './syncVideo';
import { syncYouTubeFrame } from './syncYouTube';
import { RoomSource } from './types';

interface Opts {
  source: RoomSource | null;
  playback: PlaybackState;
  resolvedUrl: string | null;
  duration: number;
  waitOnBuffer: boolean;
  peerBuffering: boolean;
  serverNow: () => number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ytPlayerRef: React.MutableRefObject<any>;
  smoothVolRef: React.MutableRefObject<number>;
  someoneSpeakingRef: React.MutableRefObject<boolean>;
  lastSpeechAtRef: React.MutableRefObject<number>;
  currentPlaylistIdxRef: React.MutableRefObject<number>;
  suppressEventsUntil: React.MutableRefObject<number>;
  lastSeekAtRef: React.MutableRefObject<number>;
  hasUserInteractedRef: React.MutableRefObject<boolean>;
  setPlaylistIdx: (i: number) => void;
  setCurrentPos: (p: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (b: boolean) => void;
  setAutoplayBlocked: (b: boolean) => void;
  onAutoplayBlockedChange?: (b: boolean) => void;
  jumpToPlaylistIndex: (idx: number, emit?: boolean) => void;
}

export function useCinemaSyncLoop(opts: Opts) {
  useEffect(() => {
    const syncOnce = () => {
      const now = opts.serverNow(), effVol = opts.smoothVolRef.current;
      if (opts.source?.kind === 'youtube') {
        syncYouTubeFrame({
          p: opts.ytPlayerRef.current, source: opts.source, playback: opts.playback, now, effVol,
          duration: opts.duration, waitOnBuffer: opts.waitOnBuffer, peerBuffering: opts.peerBuffering,
          currentPlaylistIdxRef: opts.currentPlaylistIdxRef, suppressEventsUntil: opts.suppressEventsUntil,
          lastSeekAtRef: opts.lastSeekAtRef, setPlaylistIdx: opts.setPlaylistIdx,
          setCurrentPos: opts.setCurrentPos, setDuration: opts.setDuration, jumpToPlaylistIndex: opts.jumpToPlaylistIndex,
        });
        return;
      }
      const v = opts.videoRef.current;
      if (!v || !opts.resolvedUrl) return;
      syncVideoFrame({
        v, playback: opts.playback, now, effVol, waitOnBuffer: opts.waitOnBuffer, peerBuffering: opts.peerBuffering,
        someoneSpeaking: opts.someoneSpeakingRef.current, lastSpeechAt: opts.lastSpeechAtRef.current,
        suppressEventsUntil: opts.suppressEventsUntil, lastSeekAtRef: opts.lastSeekAtRef,
        hasUserInteractedRef: opts.hasUserInteractedRef, setCurrentPos: opts.setCurrentPos,
        setDuration: opts.setDuration, setIsPlaying: opts.setIsPlaying,
        setAutoplayBlocked: opts.setAutoplayBlocked, onAutoplayBlockedChange: opts.onAutoplayBlockedChange,
      });
    };
    syncOnce();
    const t = setInterval(syncOnce, 600);
    return () => clearInterval(t);
  }, [opts.playback, opts.resolvedUrl, opts.source?.kind, opts.source?.playlist, opts.waitOnBuffer, opts.peerBuffering]);
}
