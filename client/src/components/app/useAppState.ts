import { useEffect, useRef, useState } from 'react';
import { AudioPresetId, VideoPresetId } from '../../lib/quality';
import { CallStats, PeerCall } from '../../lib/rtc';
import { Signaling } from '../../lib/signaling';
import { PlaybackState } from '../../lib/sync';
import { CamFraming } from '../CameraTile';
import { RoomSource, RoomSubs } from '../CinemaScreen';
import { DEFAULT_GAMES_STATE, GamesState } from '../CoupleGames';
import { ActivityId } from '../CuteHub';
import { DEFAULT_WHEEL_STATE, WheelState } from '../DecisionWheel';
import { DrawEvent, DrawStroke } from '../DrawingCanvas';
import { StudioBg, StudioEvent, StudioStroke } from '../DrawingStudio';
import { DEFAULT_RELAX_STATE, RelaxState } from '../RelaxRoom';
import { getOrCreateId, isMobileDevice } from './helpers';

export function useAppState() {
  const [mobile, setMobile] = useState(() => isMobileDevice());
  useEffect(() => {
    const onR = () => setMobile(isMobileDevice());
    window.addEventListener('resize', onR); window.addEventListener('orientationchange', onR);
    return () => { window.removeEventListener('resize', onR); window.removeEventListener('orientationchange', onR); };
  }, []);

  const [myId] = useState(() => getOrCreateId('druo.peerId', mobile ? 'mov' : 'pc'));
  const [mySeat, setMySeat] = useState<'left' | 'right'>(() => (localStorage.getItem('druo.seat') as 'left' | 'right') || (mobile ? 'right' : 'left'));
  const [myName, setMyName] = useState(() => localStorage.getItem('druo.name') || (mobile ? 'Ella' : 'Yo'));
  const [entered, setEntered] = useState(false);
  const [wsOnline, setWsOnline] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityId>('hub');
  const [peers, setPeers] = useState<{ id: string; session: string; name: string; seat: 'left' | 'right'; device: string }[]>([]);
  const [source, setSource] = useState<RoomSource | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({ playing: false, position: 0, rate: 1, updatedAt: Date.now() });
  const [subs, setSubs] = useState<RoomSubs | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myFraming, setMyFraming] = useState<CamFraming>(() => {
    try { const s = JSON.parse(localStorage.getItem('druo.framing') || 'null'); if (s && typeof s.zoom === 'number') return { ...s, on: true, mic: true }; } catch {}
    return { zoom: 1.0, y: 0, on: true, mic: true };
  });
  const [peerFraming, setPeerFraming] = useState<CamFraming>({ zoom: 1.0, y: 0, on: true, mic: true });
  const [showMenu, setShowMenu] = useState(false);
  const [meSpeaking, setMeSpeaking] = useState(false);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [peerSpeakingNet, setPeerSpeakingNet] = useState(false);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [peerVolume, setPeerVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem('druo.peerVolume'));
    return saved > 0 && saved <= 3.5 ? saved : 1.35;
  });
  const [peerMuted, setPeerMuted] = useState(false);
  const [waitOnBuffer, setWaitOnBuffer] = useState(true);
  const [peerBuffering, setPeerBuffering] = useState(false);
  const [movieAudioBlocked, setMovieAudioBlocked] = useState(false);
  const [voiceAudioBlocked, setVoiceAudioBlocked] = useState(false);
  const [videoPreset, setVideoPreset] = useState<VideoPresetId>('auto');
  const [audioPreset, setAudioPreset] = useState<AudioPresetId>('voice');
  const [preferredVersionKey, setPreferredVersionKey] = useState<string | null>(null);
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string; bitrate: number }[]>([]);
  const [hlsLevel, setHlsLevel] = useState(-1);
  const [movieCapBps, setMovieCapBps] = useState(0);
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [floatingReacts, setFloatingReacts] = useState<{ id: number; emoji: string }[]>([]);
  const [drawingActive, setDrawingActive] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ffcf6b');
  const [initialDrawings, setInitialDrawings] = useState<DrawStroke[]>([]);
  const drawReceiverRef = useRef<((ev: DrawEvent) => void) | null>(null);
  const [studioStrokes, setStudioStrokes] = useState<StudioStroke[]>([]);
  const [studioBg, setStudioBg] = useState<StudioBg>('cream');
  const studioReceiverRef = useRef<((ev: StudioEvent) => void) | null>(null);
  const [gamesState, setGamesState] = useState<GamesState>(DEFAULT_GAMES_STATE);
  const [wheelState, setWheelState] = useState<WheelState>(DEFAULT_WHEEL_STATE);
  const [relaxState, setRelaxState] = useState<RelaxState>(DEFAULT_RELAX_STATE);
  const [viewMode, setViewMode] = useState<'cinema' | 'call-only' | 'focus-movie' | 'duo'>(() => (mobile ? 'cinema' : (localStorage.getItem('druo.viewMode') as any) || 'cinema'));
  const [stats, setStats] = useState<CallStats>({ connected: false, viaRelay: false, rttMs: 0, lossPct: 0, outKbps: 0, inKbps: 0, activeVideoLabel: 'Auto', resolution: '480×360', fps: 20 });
  const sigRef = useRef<Signaling | null>(null);
  const rtcRef = useRef<PeerCall | null>(null);

  return {
    mobile, myId, mySeat, setMySeat, myName, setMyName, entered, setEntered, wsOnline, setWsOnline,
    storageReady, setStorageReady, activeActivity, setActiveActivity, peers, setPeers, source, setSource,
    playback, setPlayback, subs, setSubs, localStream, setLocalStream, remoteStream, setRemoteStream,
    myFraming, setMyFraming, peerFraming, setPeerFraming, showMenu, setShowMenu, meSpeaking, setMeSpeaking,
    peerSpeaking, setPeerSpeaking, peerSpeakingNet, setPeerSpeakingNet, duckingEnabled, setDuckingEnabled,
    peerVolume, setPeerVolume, peerMuted, setPeerMuted, waitOnBuffer, setWaitOnBuffer, peerBuffering, setPeerBuffering,
    movieAudioBlocked, setMovieAudioBlocked, voiceAudioBlocked, setVoiceAudioBlocked, videoPreset, setVideoPreset,
    audioPreset, setAudioPreset, preferredVersionKey, setPreferredVersionKey, hlsLevels, setHlsLevels,
    hlsLevel, setHlsLevel, movieCapBps, setMovieCapBps, localFileUrl, setLocalFileUrl, showSources, setShowSources,
    showQuality, setShowQuality, floatingReacts, setFloatingReacts, drawingActive, setDrawingActive,
    drawingColor, setDrawingColor, initialDrawings, setInitialDrawings, drawReceiverRef, studioStrokes,
    setStudioStrokes, studioBg, setStudioBg, studioReceiverRef, gamesState, setGamesState, wheelState,
    setWheelState, relaxState, setRelaxState, viewMode, setViewMode, stats, setStats, sigRef, rtcRef,
  };
}

export type AppState = ReturnType<typeof useAppState>;
