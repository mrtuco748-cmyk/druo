import { useEffect, useRef, useState } from 'react';
import { PlaybackState } from '../../lib/sync';
import { RoomSource } from './types';

interface Opts {
  isCurrentlyPlaying: boolean;
  isScrubbing: boolean;
  source: RoomSource | null;
  playback: PlaybackState;
  currentPos: number;
  volume: number;
  duration: number;
  togglePlay: () => void;
  seekTo: (pos: number) => void;
  toggleMute: () => void;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  onToggleDrawing?: () => void;
}

export function useCinemaUiControls(opts: Opts) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<any>(null);

  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (opts.isCurrentlyPlaying && !opts.isScrubbing) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    } else setControlsVisible(true);
    return () => clearTimeout(hideTimer.current);
  }, [opts.isCurrentlyPlaying, opts.isScrubbing]);

  const bumpControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (opts.isCurrentlyPlaying && !opts.isScrubbing) hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  };

  const handleStageClick = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.cinema-controls, .ctrl-btn, .autoplay-banner, .drawing-toolbar, .drawing-overlay.is-active, .screen-empty')) return;
    if (controlsVisible && opts.isCurrentlyPlaying) { setControlsVisible(false); clearTimeout(hideTimer.current); }
    else bumpControls();
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); };
  }, []);

  const toggleFullscreen = () => {
    const el = document.querySelector('.screen-bezel') as any;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!opts.source || opts.source.kind === 'embed') return;
      if (e.code === 'Space') { e.preventDefault(); opts.togglePlay(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); opts.seekTo(opts.currentPos - 10); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); opts.seekTo(opts.currentPos + 10); }
      else if (e.code === 'ArrowUp') { e.preventDefault(); opts.setVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100)); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); opts.setVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100)); }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); opts.toggleMute(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
      else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); opts.onToggleDrawing?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts.source, opts.playback.playing, opts.currentPos, opts.volume, opts.duration]);

  return { controlsVisible, isFullscreen, bumpControls, handleStageClick, toggleFullscreen };
}
