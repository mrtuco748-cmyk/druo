import { useEffect } from 'react';

interface Opts {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ytPlayerRef: React.MutableRefObject<any>;
  smoothVolRef: React.MutableRefObject<number>;
  someoneSpeaking: boolean;
  duckingEnabled: boolean;
  volume: number;
  resolvedUrl: string | null;
}

export function useCinemaDucking({
  videoRef, ytPlayerRef, smoothVolRef, someoneSpeaking, duckingEnabled, volume, resolvedUrl,
}: Opts) {
  useEffect(() => {
    const applyVol = (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      smoothVolRef.current = clamped;
      if (videoRef.current && Math.abs(videoRef.current.volume - clamped) > 0.005) {
        try { videoRef.current.volume = clamped; } catch {}
      }
      if (ytPlayerRef.current?.setVolume) {
        try { ytPlayerRef.current.setVolume(Math.round(clamped * 100)); } catch {}
      }
    };

    const targetVol = someoneSpeaking && duckingEnabled ? volume * 0.40 : volume;
    if (someoneSpeaking && duckingEnabled) { applyVol(targetVol); return; }

    const timer = setInterval(() => {
      const cur = smoothVolRef.current, diff = targetVol - cur;
      if (Math.abs(diff) < 0.012) { applyVol(targetVol); clearInterval(timer); return; }
      const step = diff > 0 ? Math.max(0.018, diff * 0.16) : diff * 0.55;
      applyVol(cur + step);
    }, 35);
    return () => clearInterval(timer);
  }, [someoneSpeaking, duckingEnabled, volume, resolvedUrl]);
}
