import React from 'react';
import { PlaybackState } from '../lib/sync';
import { DrawingCanvas, DrawEvent, DrawStroke } from './DrawingCanvas';
import { CinemaControls } from './cinema/CinemaControls';
import { CinemaEmbedScreen, CinemaEmptyScreen, CinemaLocalPrompt } from './cinema/CinemaScreens';
import { CinemaVideoElement } from './cinema/CinemaVideoElement';
import { MovieVersion, RoomSource, RoomSubs } from './cinema/types';
import { useAutoplayUnlock } from './cinema/useAutoplayUnlock';
import { createCinemaActions } from './cinema/useCinemaActions';
import { useCinemaDucking } from './cinema/useCinemaDucking';
import { useCinemaState } from './cinema/useCinemaState';
import { useCinemaSyncLoop } from './cinema/useCinemaSyncLoop';
import { useCinemaUiControls } from './cinema/useCinemaUiControls';
import { useHlsPlayer } from './cinema/useHlsPlayer';
import { useSourceResolver } from './cinema/useSourceResolver';
import { useYouTubePlayer } from './cinema/useYouTubePlayer';

export type { MovieVersion, RoomSource, RoomSubs };

interface Props {
  source: RoomSource | null; playback: PlaybackState; subs: RoomSubs | null;
  serverNow: () => number; someoneSpeaking: boolean; duckingEnabled: boolean;
  waitOnBuffer: boolean; peerBuffering: boolean; preferredVersionKey: string | null;
  hlsLevel: number; movieCapBps: number;
  onLevelsLoaded: (levels: { index: number; label: string; bitrate: number }[]) => void;
  onSelectVersionKey: (key: string) => void;
  onEmitSync: (state: { playing: boolean; position: number; playlistIndex?: number }, reason: string) => void;
  onEmitBuffering: (buffering: boolean) => void; onOpenSources: () => void;
  localFileUrl: string | null; onPickLocalFile: (f: File) => void;
  drawingActive: boolean; drawingColor: string; peerName?: string;
  initialStrokes?: DrawStroke[]; onEmitDraw: (ev: DrawEvent) => void;
  onRegisterDrawReceiver?: (receiver: (ev: DrawEvent) => void) => void;
  onCloseDrawing: () => void; onClearDrawing: () => void;
  onAutoplayBlockedChange?: (blocked: boolean) => void;
  onSelectSource?: (src: RoomSource) => void;
}

export const CinemaScreen: React.FC<Props> = (p) => {
  const st = useCinemaState(p.someoneSpeaking);
  const { resolvedUrl, trackBlobUrl } = useSourceResolver(p);
  const autoplay = useAutoplayUnlock({ ...st, playback: p.playback, onAutoplayBlockedChange: p.onAutoplayBlockedChange });
  const bufferedPct = useHlsPlayer({ ...st, ...p, ...autoplay, resolvedUrl });
  const { jumpToPlaylistIndex } = useYouTubePlayer({ ...st, ...p });

  useCinemaDucking({ ...st, ...p, resolvedUrl });
  useCinemaSyncLoop({ ...st, ...p, ...autoplay, resolvedUrl, jumpToPlaylistIndex });
  const actions = createCinemaActions({ ...st, ...p, ...autoplay });
  const ui = useCinemaUiControls({
    ...st, ...p, ...actions, isCurrentlyPlaying: p.playback.playing || st.isPlaying,
  });

  return (
    <main className={`cinema-stage ${ui.controlsVisible ? 'show-ui' : 'hide-ui'}`} onMouseMove={ui.bumpControls} onClick={ui.handleStageClick}>
      <div className="screen-bezel">
        {!p.source && <CinemaEmptyScreen onOpenSources={p.onOpenSources} onSelectSource={p.onSelectSource} />}
        {p.source?.kind === 'local' && !p.localFileUrl && <CinemaLocalPrompt title={p.source.title} onPickLocalFile={p.onPickLocalFile} />}
        {p.source?.kind === 'youtube' && <div className="yt-wrap"><div ref={st.ytHostRef} className="yt-host" /></div>}
        {p.source?.kind === 'embed' && p.source.url && <CinemaEmbedScreen url={p.source.url} />}
        {p.source && p.source.kind !== 'youtube' && p.source.kind !== 'embed' && (
          <CinemaVideoElement
            videoRef={st.videoRef} resolvedUrl={resolvedUrl} trackBlobUrl={trackBlobUrl}
            subs={p.subs} suppressEventsUntil={st.suppressEventsUntil}
            setIsPlaying={st.setIsPlaying} onEmitBuffering={p.onEmitBuffering} onEmitSync={p.onEmitSync}
          />
        )}
        {autoplay.autoplayBlocked && (
          <button type="button" className="autoplay-banner" style={{ zIndex: 30 }} onClick={(e) => { e.stopPropagation(); autoplay.unlockAudio(); }}>
            🔊 Tocá acá para activar el sonido de la película
          </button>
        )}
        {p.waitOnBuffer && p.peerBuffering && <div className="buffer-pill">⏳ Esperando un segundo a que cargue en el otro dispositivo…</div>}
        <DrawingCanvas
          active={p.drawingActive} color={p.drawingColor} width={4} peerName={p.peerName}
          initialStrokes={p.initialStrokes} onEmitDraw={p.onEmitDraw}
          onRegisterReceiver={p.onRegisterDrawReceiver} onCloseDrawing={p.onCloseDrawing} onClearDrawing={p.onClearDrawing}
        />
        {p.source && p.source.kind !== 'embed' && (
          <CinemaControls
            source={p.source} playing={p.playback.playing || st.isPlaying} currentPos={st.currentPos}
            duration={st.duration} volume={st.volume} isFullscreen={ui.isFullscreen} bufferedPct={bufferedPct}
            playlistIdx={st.playlistIdx} isScrubbing={st.isScrubbing} scrubPos={st.scrubPos}
            setIsScrubbing={st.setIsScrubbing} setScrubPos={st.setScrubPos}
            onTogglePlay={actions.togglePlay} onSeekTo={actions.seekTo}
            onJumpPlaylist={(idx) => jumpToPlaylistIndex(idx, true)}
            onToggleMute={actions.toggleMute} onChangeVolume={st.setVolume} onToggleFullscreen={ui.toggleFullscreen}
          />
        )}
      </div>
    </main>
  );
};
