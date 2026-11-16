import { useEffect, useRef } from 'react';
import { getSharedAudioContext } from '../../lib/audio/audioContext';

interface Opts {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioBoost: number;
  resolvedUrl: string | null;
}

export function useMovieAudioBooster({ videoRef, audioBoost, resolvedUrl }: Opts) {
  const gainNodeRef = useRef<GainNode | null>(null);
  const hookedVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolvedUrl) return;
    if (audioBoost <= 1 && !hookedVideoRef.current) return;

    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (hookedVideoRef.current !== v) {
      try {
        const source = ctx.createMediaElementSource(v);
        const gainNode = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.knee.value = 12;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        source.connect(gainNode).connect(compressor).connect(ctx.destination);
        gainNodeRef.current = gainNode;
        hookedVideoRef.current = v;
      } catch {}
    }

    if (gainNodeRef.current) {
      try { gainNodeRef.current.gain.setTargetAtTime(audioBoost, ctx.currentTime, 0.02); }
      catch { gainNodeRef.current.gain.value = audioBoost; }
    }
  }, [audioBoost, resolvedUrl]);
}
