import Hls from 'hls.js';
import { useEffect, useState } from 'react';
import { expectedPosition, PlaybackState } from '../../lib/sync';
import { RoomSource } from './types';

interface Opts {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.MutableRefObject<Hls | null>;
  suppressEventsUntil: React.MutableRefObject<number>;
  source: RoomSource | null; resolvedUrl: string | null; playback: PlaybackState;
  serverNow: () => number; hlsLevel: number; movieCapBps: number;
  onLevelsLoaded: (lvls: { index: number; label: string; bitrate: number }[]) => void;
  setDuration: (d: number) => void; setAutoplayBlocked: (b: boolean) => void;
  onAutoplayBlockedChange?: (b: boolean) => void;
}

export function useHlsPlayer({
  videoRef, hlsRef, suppressEventsUntil, source, resolvedUrl, playback, serverNow,
  hlsLevel, movieCapBps, onLevelsLoaded, setDuration, setAutoplayBlocked, onAutoplayBlockedChange,
}: Opts) {
  const [bufferedPct, setBufferedPct] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !source || source.kind === 'youtube') return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (!resolvedUrl) { v.removeAttribute('src'); v.load(); return; }

    const savedPos = expectedPosition(playback, serverNow());
    suppressEventsUntil.current = Date.now() + 900;

    const tryPlay = () => {
      if (!playback.playing) return;
      v.play()
        .then(() => { setAutoplayBlocked(false); onAutoplayBlockedChange?.(false); })
        .catch(() => { v.muted = true; v.play().catch(() => {}); setAutoplayBlocked(true); onAutoplayBlockedChange?.(true); });
    };

    if (source.kind === 'hls' && Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30, backBufferLength: 20, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_ev, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLevelsLoaded(hls.levels.map((l, idx) => ({
          index: idx, label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)} kbps`, bitrate: l.bitrate || 0,
        })));
        if (savedPos > 1) v.currentTime = savedPos;
        tryPlay();
      });
    } else {
      v.src = resolvedUrl;
      v.onloadedmetadata = () => {
        setDuration(v.duration || 0);
        if (savedPos > 1 && savedPos < (v.duration || Infinity)) v.currentTime = savedPos;
        tryPlay();
      };
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [resolvedUrl, source?.kind]);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (hlsLevel >= 0) hls.currentLevel = hlsLevel;
    else if (movieCapBps > 0 && hls.levels?.length) {
      let maxIdx = 0;
      hls.levels.forEach((l, idx) => { if ((l.bitrate || 0) <= movieCapBps) maxIdx = idx; });
      hls.autoLevelCapping = maxIdx; hls.currentLevel = -1;
    } else {
      hls.autoLevelCapping = -1; hls.currentLevel = -1;
    }
  }, [hlsLevel, movieCapBps]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const updateBuf = () => {
      if (!v.duration || !v.buffered.length) { setBufferedPct(0); return; }
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
          setBufferedPct((v.buffered.end(i) / v.duration) * 100);
          return;
        }
      }
    };
    v.addEventListener('progress', updateBuf);
    return () => v.removeEventListener('progress', updateBuf);
  }, [resolvedUrl]);

  return bufferedPct;
}
