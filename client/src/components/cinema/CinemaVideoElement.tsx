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
    ref={videoRef}
    className={`cinema-video ${!resolvedUrl ? 'is-hidden' : ''}`}
    playsInline
    // @ts-ignore
    webkit-playsinline="true"
    // @ts-ignore
    x5-playsinline="true"
    onWaiting={() => onEmitBuffering(true)}
    onPlaying={() => { onEmitBuffering(false); setIsPlaying(true); }}
    onPause={() => {
      if (Date.now() < suppressEventsUntil.current) return;
      setIsPlaying(false);
      if (videoRef.current && !videoRef.current.ended) {
        onEmitSync({ playing: false, position: videoRef.current.currentTime }, 'pause');
      }
    }}
    onPlay={() => {
      if (Date.now() < suppressEventsUntil.current) return;
      setIsPlaying(true);
      if (videoRef.current) onEmitSync({ playing: true, position: videoRef.current.currentTime }, 'play');
    }}
  >
    {trackBlobUrl && <track kind="subtitles" src={trackBlobUrl} srcLang="es" label={subs?.name || 'Subtítulos'} default />}
  </video>
);
