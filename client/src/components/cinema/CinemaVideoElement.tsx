import React from 'react';
import { RoomSubs } from './types';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  resolvedUrl: string | null;
  trackBlobUrl: string | null;
  subs: RoomSubs | null;
  suppressEventsUntil: React.MutableRefObject<number>;
  setIsPlaying: (b: boolean) => void;
  onEmitBuffering: (b: boolean) => void;
  onEmitSync: (s: { playing: boolean; position: number }, reason: string) => void;
}

export const CinemaVideoElement: React.FC<Props> = ({
  videoRef, resolvedUrl, trackBlobUrl, subs, suppressEventsUntil,
  setIsPlaying, onEmitBuffering, onEmitSync,
}) => (
  <video
    key={resolvedUrl || 'idle'}
    ref={videoRef}
    className={`cinema-video ${!resolvedUrl ? 'is-hidden' : ''}`}
    playsInline
    // @ts-ignore
    webkit-playsinline="true"
    // @ts-ignore
    x5-playsinline="true"
    onWaiting={() => onEmitBuffering(true)}
    onPlaying={() => { onEmitBuffering(false); setIsPlaying(true); }}
    onPause={() => setIsPlaying(false)}
    onPlay={() => setIsPlaying(true)}
    onEnded={() => {
      setIsPlaying(false);
      if (videoRef.current) onEmitSync({ playing: false, position: videoRef.current.duration || 0 }, 'ended');
    }}
  >
    {trackBlobUrl && <track kind="subtitles" src={trackBlobUrl} srcLang="es" label={subs?.name || 'Subtítulos'} default />}
  </video>
);
