import { useEffect, useRef, useState } from 'react';
import { PlaybackState } from '../../lib/sync';

interface Opts {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ytPlayerRef: React.MutableRefObject<any>;
  playback: PlaybackState;
  onAutoplayBlockedChange?: (b: boolean) => void;
}

export function useAutoplayUnlock({ videoRef, ytPlayerRef, playback, onAutoplayBlockedChange }: Opts) {
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const hasUserInteractedRef = useRef(false);

  const unlockAudio = () => {
    hasUserInteractedRef.current = true;
    const v = videoRef.current;
    if (v) { v.muted = false; if (v.paused && playback.playing) v.play().catch(() => {}); }
    if (ytPlayerRef.current?.unMute) {
      try { ytPlayerRef.current.unMute(); if (playback.playing) ytPlayerRef.current.playVideo?.(); } catch {}
    }
    setAutoplayBlocked(false);
    onAutoplayBlockedChange?.(false);
  };

  useEffect(() => {
    const onUserInteraction = () => {
      hasUserInteractedRef.current = true;
      const v = videoRef.current;
      if (v && v.muted) {
        v.muted = false;
        setAutoplayBlocked(false);
        onAutoplayBlockedChange?.(false);
      }
    };
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    return () => {
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('pointerdown', onUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!autoplayBlocked) return;
    const onGesture = () => unlockAudio();
    window.addEventListener('click', onGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    return () => { window.removeEventListener('click', onGesture); window.removeEventListener('touchstart', onGesture); };
  }, [autoplayBlocked, playback.playing]);

  return { autoplayBlocked, setAutoplayBlocked, hasUserInteractedRef, unlockAudio };
}
