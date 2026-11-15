import { useEffect } from 'react';
import { expectedPosition, PlaybackState } from '../../lib/sync';
import { loadYouTubeApi, RoomSource } from './types';

interface Opts {
  ytHostRef: React.RefObject<HTMLDivElement | null>;
  ytPlayerRef: React.MutableRefObject<any>;
  suppressEventsUntil: React.MutableRefObject<number>;
  lastSeekAtRef: React.MutableRefObject<number>;
  currentPlaylistIdxRef: React.MutableRefObject<number>;
  source: RoomSource | null; playback: PlaybackState; serverNow: () => number;
  setPlaylistIdx: (i: number) => void; setDuration: (d: number) => void;
  setCurrentPos: (p: number) => void; setIsPlaying: (b: boolean) => void;
  onEmitSync: (s: { playing: boolean; position: number; playlistIndex?: number }, reason: string) => void;
  onEmitBuffering: (b: boolean) => void;
}

export function useYouTubePlayer(opts: Opts) {
  const { ytHostRef, ytPlayerRef, suppressEventsUntil, lastSeekAtRef, currentPlaylistIdxRef, source, playback, serverNow } = opts;

  const jumpToPlaylistIndex = (nextIdx: number, emit = true) => {
    const list = source?.playlist;
    if (!list || nextIdx < 0 || nextIdx >= list.length) return;
    currentPlaylistIdxRef.current = nextIdx;
    opts.setPlaylistIdx(nextIdx);
    opts.setCurrentPos(0);
    const p = ytPlayerRef.current;
    suppressEventsUntil.current = Date.now() + 900;
    lastSeekAtRef.current = Date.now();
    if (p && typeof p.loadVideoById === 'function') {
      p.loadVideoById({ videoId: list[nextIdx], startSeconds: 0 });
      if (playback.playing || emit) { try { p.playVideo?.(); } catch {} }
    }
    if (emit) opts.onEmitSync({ playing: true, position: 0, playlistIndex: nextIdx }, 'playlist-part');
  };

  useEffect(() => {
    if (source?.kind !== 'youtube' || !source.id) {
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} ytPlayerRef.current = null; }
      return;
    }
    let cancelled = false;
    const initIdx = playback.playlistIndex ?? source.playlistIndex ?? 0;
    currentPlaylistIdxRef.current = initIdx;
    opts.setPlaylistIdx(initIdx);
    const initialVideoId = source.playlist?.[initIdx] || source.id;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !ytHostRef.current) return;
      try { ytPlayerRef.current?.destroy(); } catch {}
      ytPlayerRef.current = new YT.Player(ytHostRef.current, {
        videoId: initialVideoId,
        playerVars: {
          autoplay: playback.playing ? 1 : 0, controls: 0, rel: 0, modestbranding: 1,
          playsinline: 1, iv_load_policy: 3, start: Math.floor(expectedPosition(playback, serverNow())),
        },
        events: {
          onReady: (ev: any) => {
            opts.setDuration(ev.target.getDuration() || 0);
            const target = expectedPosition(playback, serverNow());
            if (target > 1) ev.target.seekTo(target, true);
            if (playback.playing) ev.target.playVideo(); else ev.target.pauseVideo();
          },
          onStateChange: (ev: any) => {
            const p = ev.target;
            if (ev.data === YT.PlayerState.BUFFERING) { opts.onEmitBuffering(true); return; }
            if (ev.data === YT.PlayerState.PLAYING || ev.data === YT.PlayerState.PAUSED) opts.onEmitBuffering(false);
            if (ev.data === YT.PlayerState.ENDED && source.playlist && currentPlaylistIdxRef.current + 1 < source.playlist.length) {
              jumpToPlaylistIndex(currentPlaylistIdxRef.current + 1, true);
              return;
            }
            if (Date.now() < suppressEventsUntil.current) return;
            if (ev.data === YT.PlayerState.PLAYING) {
              opts.setIsPlaying(true); opts.setDuration(p.getDuration() || 0);
              opts.onEmitSync({ playing: true, position: p.getCurrentTime() || 0, playlistIndex: currentPlaylistIdxRef.current }, 'play');
            } else if (ev.data === YT.PlayerState.PAUSED) {
              opts.setIsPlaying(false);
              opts.onEmitSync({ playing: false, position: p.getCurrentTime() || 0, playlistIndex: currentPlaylistIdxRef.current }, 'pause');
            }
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [source?.kind, source?.listId || source?.id]);

  return { jumpToPlaylistIndex };
}
