import Hls from 'hls.js';
import { useRef, useState } from 'react';

export function useCinemaState(someoneSpeaking: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const suppressEventsUntil = useRef(0);
  const lastSeekAtRef = useRef(0);
  const currentPlaylistIdxRef = useRef(0);
  const smoothVolRef = useRef(0.85);
  const lastSpeechAtRef = useRef(0);
  const someoneSpeakingRef = useRef(someoneSpeaking);
  someoneSpeakingRef.current = someoneSpeaking;
  if (someoneSpeaking) lastSpeechAtRef.current = Date.now();

  const [playlistIdx, setPlaylistIdx] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPos, setCurrentPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [prevVol, setPrevVol] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);

  return {
    videoRef, hlsRef, ytHostRef, ytPlayerRef, suppressEventsUntil, lastSeekAtRef,
    currentPlaylistIdxRef, smoothVolRef, lastSpeechAtRef, someoneSpeakingRef,
    playlistIdx, setPlaylistIdx, duration, setDuration, currentPos, setCurrentPos,
    isPlaying, setIsPlaying, volume, setVolume, prevVol, setPrevVol,
    isScrubbing, setIsScrubbing, scrubPos, setScrubPos,
  };
}
