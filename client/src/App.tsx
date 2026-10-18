import React, { useEffect, useRef, useState } from 'react';
import { CameraTile, CamFraming } from './components/CameraTile';
import { CinemaScreen, RoomSource, RoomSubs } from './components/CinemaScreen';
import { CoupleGames, DEFAULT_GAMES_STATE, GamesState } from './components/CoupleGames';
import { ActivityId, CuteHub } from './components/CuteHub';
import { DecisionWheel, DEFAULT_WHEEL_STATE, WheelState } from './components/DecisionWheel';
import { DrawEvent, DrawStroke } from './components/DrawingCanvas';
import { DrawingStudio, StudioBg, StudioEvent, StudioStroke } from './components/DrawingStudio';
import {
  IconBrush,
  IconChevronLeft,
  IconChevronRight,
  IconCinema,
  IconCoffee,
  IconGamepad,
  IconHeart,
  IconHome,
  IconMicOff,
  IconMicOn,
  IconSliders,
  IconSparkle,
  IconStar,
  IconVolume,
  IconWheel,
} from './components/KawaiiIcons';
import { OptionsMenu } from './components/OptionsMenu';
import { QualityDrawer } from './components/QualityDrawer';
import { DEFAULT_RELAX_STATE, RelaxRoom, RelaxState } from './components/RelaxRoom';
import { SourceDrawer } from './components/SourceDrawer';
import { AudioPresetId, VideoPresetId } from './lib/quality';
import { CallStats, PeerCall } from './lib/rtc';
import { Signaling } from './lib/signaling';
import { PlaybackState } from './lib/sync';
import { resumeSharedAudioContext } from './lib/voiceEngine';

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 820;

function getOrCreateId(key: string, prefix: string) {
  let v = localStorage.getItem(key);
  if (!v) {
    v = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, v);
  }
  return v;
}

const SESSION_ID = `s-${Math.random().toString(36).slice(2, 10)}`;

export const App: React.FC = () => {
  const mobile = isMobileDevice();
  const [myId] = useState(() => getOrCreateId('druo.peerId', mobile ? 'mov' : 'pc'));
  const [mySeat, setMySeat] = useState<'left' | 'right'>(
    () => (localStorage.getItem('druo.seat') as 'left' | 'right') || (mobile ? 'right' : 'left')
  );
  const [myName, setMyName] = useState(
    () => localStorage.getItem('druo.name') || (mobile ? 'Ella' : 'Yo')
  );
  const [entered, setEntered] = useState(false);
  const [wsOnline, setWsOnline] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityId>('hub');

  const [peers, setPeers] = useState<{ id: string; session: string; name: string; seat: 'left' | 'right'; device: string }[]>([]);
  const [source, setSource] = useState<RoomSource | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    playing: false,
    position: 0,
    rate: 1,
    updatedAt: Date.now(),
  });
  const [subs, setSubs] = useState<RoomSubs | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [myFraming, setMyFraming] = useState<CamFraming>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('druo.framing') || 'null');
      if (saved && typeof saved.zoom === 'number') return { ...saved, on: true, mic: true };
    } catch {}
    // Por defecto zoom 1.0x para que la cara quede perfectamente encuadrada sin cortes
    return { zoom: 1.0, y: 0, on: true, mic: true };
  });
  const [peerFraming, setPeerFraming] = useState<CamFraming>({ zoom: 1.0, y: 0, on: true, mic: true });
  const [showMenu, setShowMenu] = useState(false);

  const [meSpeaking, setMeSpeaking] = useState(false);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [peerSpeakingNet, setPeerSpeakingNet] = useState(false);
  const [duckingEnabled, setDuckingEnabled] = useState(true); // Activado por defecto para que baje la peli cuando hablan
  const [peerVolume, setPeerVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem('druo.peerVolume'));
    return saved > 0 && saved <= 4.0 ? saved : 2.0; // Por defecto 200% para que las voces se escuchen siempre más fuerte
  });
  const [peerMuted, setPeerMuted] = useState(false);
  const [waitOnBuffer, setWaitOnBuffer] = useState(true);
  const [peerBuffering, setPeerBuffering] = useState(false);

  const handleMeSpeakingChange = (sp: boolean) => {
    setMeSpeaking(sp);
    sigRef.current?.send({ t: 'speaking', value: sp });
  };

  const handleChangePeerVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(4.0, v));
    setPeerVolume(clamped);
    localStorage.setItem('druo.peerVolume', String(clamped));
  };

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

  // Estados sincronizados de las nuevas actividades en tiempo real
  const [studioStrokes, setStudioStrokes] = useState<StudioStroke[]>([]);
  const [studioBg, setStudioBg] = useState<StudioBg>('cream');
  const studioReceiverRef = useRef<((ev: StudioEvent) => void) | null>(null);
  const [gamesState, setGamesState] = useState<GamesState>(DEFAULT_GAMES_STATE);
  const [wheelState, setWheelState] = useState<WheelState>(DEFAULT_WHEEL_STATE);
  const [relaxState, setRelaxState] = useState<RelaxState>(DEFAULT_RELAX_STATE);

  const [viewMode, setViewMode] = useState<'cinema' | 'call-only' | 'focus-movie' | 'duo'>(() => {
    if (mobile) return 'cinema';
    return (localStorage.getItem('druo.viewMode') as any) || 'cinema';
  });

  const [immersiveMode, setImmersiveMode] = useState(false);
  const [immersiveToast, setImmersiveToast] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);
  const lastTapRef = useRef<number>(0);

  const toggleImmersiveMode = () => {
    setImmersiveMode((prev) => {
      const next = !prev;
      clearTimeout(toastTimerRef.current);
      setImmersiveToast(
        next
          ? '✨ Modo inmersivo activado · Toca 2 veces para mostrar controles'
          : '✨ Interfaz visible'
      );
      toastTimerRef.current = setTimeout(() => {
        setImmersiveToast(null);
      }, 2500);
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, input, select, textarea, .ctrl-btn, .ctrl-timeline-wrap, .cam-slot, .top-btn, .kawaii-options-popover, .modal-card, .drawing-toolbar, .drawing-canvas, a'
      )
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 380) {
      toggleImmersiveMode();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  useEffect(() => {
    if (mobile && viewMode !== 'cinema') {
      setViewMode('cinema');
      localStorage.setItem('druo.viewMode', 'cinema');
    }
  }, [mobile, viewMode]);

  const handleSelectViewMode = (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => {
    if (mobile) return;
    setViewMode(mode);
    localStorage.setItem('druo.viewMode', mode);
  };

  const handleSelectActivity = (act: ActivityId) => {
    setActiveActivity(act);
    if (viewMode === 'call-only') {
      handleSelectViewMode('cinema');
    }
    sigRef.current?.send({ t: 'activity', activity: act });
  };

  const [stats, setStats] = useState<CallStats>({
    connected: false,
    viaRelay: false,
    rttMs: 0,
    lossPct: 0,
    outKbps: 0,
    inKbps: 0,
    activeVideoLabel: 'Auto',
    resolution: '480×360',
    fps: 20,
  });

  const sigRef = useRef<Signaling | null>(null);
  const rtcRef = useRef<PeerCall | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((j) => setStorageReady(!!j.storage))
      .catch(() => {});
  }, []);

  // Keep-alive: ping al servidor cada 3 minutos para mantener despierto Render mientras usan la sala
  useEffect(() => {
    if (!entered) return;
    const ping = () => {
      fetch('/api/keepalive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: myId }),
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [entered, myId]);

  const unlockAllAudio = () => {
    resumeSharedAudioContext();
    setMovieAudioBlocked(false);
    setVoiceAudioBlocked(false);
  };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    setFloatingReacts((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReacts((prev) => prev.filter((r) => r.id !== id));
    }, 2600);
  };

  // Arrancar cámara, WebSocket y WebRTC al entrar a la sala
  const enterTheater = async () => {
    // Desbloquear AudioContext síncronamente en el click de entrada
    unlockAllAudio();

    localStorage.setItem('druo.seat', mySeat);
    localStorage.setItem('druo.name', myName);
    setEntered(true);

    // En celular, pedir WakeLock (que no se apague la pantalla)
    try {
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').catch(() => {});
      }
    } catch {}

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
        },
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      setLocalStream(stream);
    } catch (e1) {
      console.warn('Fallo getUserMedia con constraints ideales, reintentando básico audio+video:', e1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setLocalStream(stream);
      } catch (e2) {
        console.warn('Fallo cámara y audio, reintentando solo audio:', e2);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(stream);
        } catch {}
      }
    }

    const iceRes = await fetch('/api/ice')
      .then((r) => r.json())
      .catch(() => ({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] }));

    const rtc = new PeerCall(
      myId,
      (data) => sigRef.current?.send({ t: 'signal', data }),
      (rem) => setRemoteStream(new MediaStream(rem.getTracks())),
      (st) => setStats(st)
    );
    rtcRef.current = rtc;
    await rtc.init(iceRes.iceServers || [], stream);

    const sig = new Signaling(
      {
        id: myId,
        session: SESSION_ID,
        name: myName,
        seat: mySeat,
        device: mobile ? 'mobile' : 'desktop',
      },
      (m) => {
        if (m.t === 'welcome') {
          if (m.you?.seat) setMySeat(m.you.seat);
          if (m.state) {
            setPeers(m.state.peers || []);
            setSource(m.state.source || null);
            if (m.state.playback) setPlayback(m.state.playback);
            setSubs(m.state.subs || null);
            if (m.state.drawings) setInitialDrawings(m.state.drawings);
            if (m.state.activity) setActiveActivity(m.state.activity);
            if (Array.isArray(m.state.studioStrokes)) setStudioStrokes(m.state.studioStrokes);
            if (m.state.studioBg) setStudioBg(m.state.studioBg);
            if (m.state.sharedState?.games) setGamesState(m.state.sharedState.games);
            if (m.state.sharedState?.wheel) setWheelState(m.state.sharedState.wheel);
            if (m.state.sharedState?.relax) setRelaxState(m.state.sharedState.relax);
            const other = (m.state.peers || []).find((p: any) => p.id !== myId);
            if (other && m.state.cams?.[other.id]) {
              setPeerFraming(m.state.cams[other.id]);
            }
          }
          sig.send({ t: 'cam', ...myFraming });
        } else if (m.t === 'peers') {
          setPeers(m.peers || []);
        } else if (m.t === 'signal') {
          rtcRef.current?.onSignal(m.from, m.session, m.data);
        } else if (m.t === 'sync' && m.playback) {
          setPlayback(m.playback);
        } else if (m.t === 'source') {
          setPreferredVersionKey(null);
          setSource(m.source || null);
          if (m.playback) setPlayback(m.playback);
          if (m.source) setActiveActivity('cinema');
        } else if (m.t === 'subs') {
          setSubs(m.subs || null);
        } else if (m.t === 'cam' && m.id !== myId) {
          setPeerFraming({
            zoom: Number(m.zoom) || 1.0,
            y: Number(m.y) || 0,
            on: m.on !== false,
            mic: m.mic !== false,
          });
        } else if (m.t === 'buffering') {
          setPeerBuffering(!!m.value);
        } else if (m.t === 'speaking') {
          setPeerSpeakingNet(!!m.value);
        } else if (m.t === 'react' && m.emoji) {
          spawnReaction(m.emoji);
        } else if (m.t === 'draw') {
          drawReceiverRef.current?.(m);
        } else if (m.t === 'activity' && m.activity) {
          setActiveActivity(m.activity);
        } else if (m.t === 'studio') {
          studioReceiverRef.current?.(m as StudioEvent);
        } else if (m.t === 'shared' && m.section && m.data) {
          if (m.section === 'games') setGamesState(m.data);
          else if (m.section === 'wheel') setWheelState(m.data);
          else if (m.section === 'relax') setRelaxState(m.data);
        }
      },
      (online) => setWsOnline(online)
    );
    sigRef.current = sig;
  };

  // Sincronizar con el otro peer cuando entra o sale de la sala
  useEffect(() => {
    const other = peers.find((p) => p.id !== myId);
    rtcRef.current?.setRemotePeer(other ? other.id : null, other?.session);
    if (!other) {
      setPeerBuffering(false);
      setPeerSpeakingNet(false);
    }
  }, [peers, myId]);

  const updateMyFraming = (next: CamFraming) => {
    setMyFraming(next);
    localStorage.setItem('druo.framing', JSON.stringify({ zoom: next.zoom, y: next.y }));
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = next.on));
      localStream.getAudioTracks().forEach((t) => (t.enabled = next.mic));
    }
    sigRef.current?.send({ t: 'cam', ...next });
  };

  const toggleMic = () => updateMyFraming({ ...myFraming, mic: !myFraming.mic });
  const toggleCam = () => updateMyFraming({ ...myFraming, on: !myFraming.on });

  const handleSelectSource = (src: RoomSource) => {
    setPreferredVersionKey(null);
    setSource(src);
    setActiveActivity('cinema');
    sigRef.current?.send({ t: 'source', source: src });
  };

  const handleSelectLocalFile = (file: File, announce: boolean) => {
    if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);
    if (announce) {
      const src: RoomSource = { kind: 'local', title: file.name, size: file.size };
      setSource(src);
      setActiveActivity('cinema');
      sigRef.current?.send({ t: 'source', source: src });
    }
  };

  const handleEmitSync = (
    state: { playing: boolean; position: number; playlistIndex?: number },
    reason: string
  ) => {
    const now = sigRef.current?.clock.now() || Date.now();
    const next: PlaybackState = {
      playing: state.playing,
      position: state.position,
      rate: 1,
      playlistIndex: state.playlistIndex ?? playback.playlistIndex ?? 0,
      updatedAt: now,
      by: myId,
    };
    setPlayback(next);
    sigRef.current?.send({ t: 'sync', state: { ...state, playlistIndex: next.playlistIndex }, at: now, reason });
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        if ((screen.orientation as any)?.lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const otherPeer = peers.find((p) => p.id !== myId) || null;
  const leftIsMe = mySeat === 'left';

  if (!entered) {
    return (
      <div className="lobby-curtain kawaii-lobby">
        <div className="lobby-card kawaii-lobby-card">
          <div className="kawaii-lobby-heart">
            <IconHeart size={36} />
          </div>
          <div className="lobby-logo">DRUO</div>

          <div className="lobby-fields">
            <label className="field-block">
              <input
                type="text"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                maxLength={24}
                placeholder="Nombre"
              />
            </label>

            <div className="seat-picker">
              <button
                type="button"
                className={`seat-btn ${mySeat === 'left' ? 'active' : ''}`}
                onClick={() => setMySeat('left')}
                aria-label="Left"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                type="button"
                className={`seat-btn ${mySeat === 'right' ? 'active' : ''}`}
                onClick={() => setMySeat('right')}
                aria-label="Right"
              >
                <IconChevronRight size={24} />
              </button>
            </div>
          </div>

          <button type="button" className="cta-enter kawaii-enter-btn" onClick={enterTheater} aria-label="Enter">
            <IconHeart size={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`theater-shell view-${viewMode} activity-${activeActivity} ${
        activeActivity !== 'cinema' ? 'is-interactive-activity' : 'is-cinema-activity'
      } ${immersiveMode ? 'is-ui-hidden' : ''}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={toggleImmersiveMode}
    >
      {/* Barra superior Pastel Kawaii minimalista (Solo Iconos SVG, Sin Textos, Sin Emojis) */}
      <header className="theater-topbar kawaii-topbar">
        <div className="brand-cluster">
          <div className="topbar-activity-tabs kawaii-nav-pills">
            {(
              [
                { id: 'hub', render: () => <IconHome size={19} /> },
                { id: 'cinema', render: () => <IconCinema size={19} /> },
                { id: 'draw', render: () => <IconBrush size={19} /> },
                { id: 'games', render: () => <IconGamepad size={19} /> },
                { id: 'wheel', render: () => <IconWheel size={19} /> },
                { id: 'relax', render: () => <IconCoffee size={19} /> },
              ] as { id: ActivityId; render: () => React.ReactNode }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`topbar-act-btn ${activeActivity === tab.id ? 'active' : ''}`}
                onClick={() => handleSelectActivity(tab.id)}
                aria-label={tab.id}
              >
                {tab.render()}
              </button>
            ))}
          </div>

          <span
            className={`kawaii-status-dot ${wsOnline ? (otherPeer ? 'both' : 'wait') : 'off'}`}
          />
        </div>

        <div className="action-cluster">
          {/* Reacciones rápidas (Solo Iconos SVG) */}
          <div className="react-bar kawaii-react-bar">
            <button
              type="button"
              className="react-btn"
              onClick={() => {
                spawnReaction('♥');
                sigRef.current?.send({ t: 'react', emoji: '♥' });
              }}
              aria-label="Heart"
            >
              <IconHeart size={18} />
            </button>
            <button
              type="button"
              className="react-btn"
              onClick={() => {
                spawnReaction('✦');
                sigRef.current?.send({ t: 'react', emoji: '✦' });
              }}
              aria-label="Sparkle"
            >
              <IconSparkle size={18} />
            </button>
            <button
              type="button"
              className="react-btn"
              onClick={() => {
                spawnReaction('★');
                sigRef.current?.send({ t: 'react', emoji: '★' });
              }}
              aria-label="Star"
            >
              <IconStar size={18} />
            </button>
          </div>

          {/* Botón rápido de mic (Solo Icono SVG) */}
          <button
            type="button"
            className={`top-btn quick-mic-btn ${myFraming.mic ? '' : 'is-off'}`}
            onClick={toggleMic}
            aria-label="Microphone"
          >
            {myFraming.mic ? <IconMicOn size={19} /> : <IconMicOff size={19} />}
          </button>

          {/* Único botón de Menú desplegable (Solo Icono SVG) */}
          <button
            type="button"
            className={`top-btn menu-toggle-btn ${showMenu ? 'accent' : ''}`}
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Menu"
          >
            <IconSliders size={19} />
          </button>
        </div>
      </header>

      {/* Menú desplegable unificado (Solo Iconos) */}
      <OptionsMenu
        open={showMenu}
        onClose={() => setShowMenu(false)}
        isMobile={mobile}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
        onOpenSources={() => {
          setActiveActivity('cinema');
          setShowSources(true);
        }}
        drawingActive={drawingActive}
        onToggleDrawing={() => setDrawingActive((d) => !d)}
        drawingColor={drawingColor}
        onSelectDrawingColor={setDrawingColor}
        myFraming={myFraming}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onChangeFraming={updateMyFraming}
        peerVolume={peerVolume}
        onChangePeerVolume={handleChangePeerVolume}
        peerMuted={peerMuted}
        onTogglePeerMuted={() => setPeerMuted((m) => !m)}
        duckingEnabled={duckingEnabled}
        onToggleDucking={() => setDuckingEnabled((d) => !d)}
        onOpenQuality={() => setShowQuality(true)}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Banner de audio para celulares si el navegador bloquea sonido */}
      {(movieAudioBlocked || voiceAudioBlocked) && (
        <button type="button" className="master-audio-banner" onClick={unlockAllAudio} aria-label="Unlock Audio">
          <IconVolume size={22} />
        </button>
      )}

      {/* Botón flotante para volver al cine en Solo Videollamada (Solo PC) */}
      {viewMode === 'call-only' && !mobile && (
        <button
          type="button"
          className="call-return-btn"
          onClick={() => handleSelectViewMode('cinema')}
          aria-label="Return"
        >
          <IconHome size={20} />
        </button>
      )}

      {/* Escenario principal: Cámara Izquierda | Actividad Central | Cámara Derecha */}
      <div className="theater-grid">
        <CameraTile
          side="left"
          label={leftIsMe ? myName : otherPeer?.name || 'Izquierda'}
          isMe={leftIsMe}
          online={leftIsMe ? true : !!otherPeer}
          stream={leftIsMe ? localStream : remoteStream}
          framing={leftIsMe ? myFraming : peerFraming}
          onChangeFraming={leftIsMe ? updateMyFraming : undefined}
          onSpeakingChange={leftIsMe ? handleMeSpeakingChange : setPeerSpeaking}
          externalSpeaking={!leftIsMe ? peerSpeakingNet : false}
          onAudioBlockedChange={!leftIsMe ? setVoiceAudioBlocked : undefined}
          peerVolume={peerVolume}
          onChangePeerVolume={handleChangePeerVolume}
          peerMuted={peerMuted}
          onTogglePeerMuted={() => setPeerMuted((m) => !m)}
        />

        {activeActivity === 'hub' && (
          <CuteHub
            myName={myName}
            peerName={otherPeer?.name}
            hasMovieLoaded={!!source}
            movieTitle={source?.title}
            onSelectActivity={handleSelectActivity}
            onSendReaction={(em) => {
              spawnReaction(em);
              sigRef.current?.send({ t: 'react', emoji: em });
            }}
          />
        )}

        {activeActivity === 'cinema' && (
          <CinemaScreen
            source={source}
            playback={playback}
            subs={subs}
            serverNow={() => sigRef.current?.clock.now() || Date.now()}
            someoneSpeaking={peerSpeaking || peerSpeakingNet}
            duckingEnabled={duckingEnabled}
            waitOnBuffer={waitOnBuffer}
            peerBuffering={peerBuffering}
            preferredVersionKey={preferredVersionKey}
            hlsLevel={hlsLevel}
            movieCapBps={movieCapBps}
            onLevelsLoaded={setHlsLevels}
            onSelectVersionKey={setPreferredVersionKey}
            onEmitSync={handleEmitSync}
            onEmitBuffering={(b) => sigRef.current?.send({ t: 'buffering', value: b })}
            onOpenSources={() => setShowSources(true)}
            localFileUrl={localFileUrl}
            onPickLocalFile={(f) => handleSelectLocalFile(f, false)}
            drawingActive={drawingActive}
            drawingColor={drawingColor}
            peerName={otherPeer?.name}
            initialStrokes={initialDrawings}
            onEmitDraw={(ev) => sigRef.current?.send(ev)}
            onRegisterDrawReceiver={(receiver) => {
              drawReceiverRef.current = receiver;
            }}
            onCloseDrawing={() => setDrawingActive(false)}
            onClearDrawing={() => {
              setInitialDrawings([]);
            }}
            onAutoplayBlockedChange={setMovieAudioBlocked}
          />
        )}

        {activeActivity === 'draw' && (
          <DrawingStudio
            myId={myId}
            myName={myName}
            peerName={otherPeer?.name}
            initialStrokes={studioStrokes}
            initialBg={studioBg}
            onEmitStudio={(ev) => sigRef.current?.send(ev)}
            onRegisterStudioReceiver={(receiver) => {
              studioReceiverRef.current = receiver;
            }}
            onSyncLocalState={(strokes, bg) => {
              setStudioStrokes(strokes);
              setStudioBg(bg);
            }}
            onBackToHub={() => handleSelectActivity('hub')}
          />
        )}

        {activeActivity === 'games' && (
          <CoupleGames
            myName={myName}
            peerName={otherPeer?.name}
            mySeat={mySeat}
            state={gamesState}
            onUpdateState={(next) => {
              setGamesState(next);
              sigRef.current?.send({ t: 'shared', section: 'games', data: next });
            }}
            onBackToHub={() => handleSelectActivity('hub')}
          />
        )}

        {activeActivity === 'wheel' && (
          <DecisionWheel
            state={wheelState}
            onUpdateState={(next) => {
              setWheelState(next);
              sigRef.current?.send({ t: 'shared', section: 'wheel', data: next });
            }}
            onBackToHub={() => handleSelectActivity('hub')}
          />
        )}

        {activeActivity === 'relax' && (
          <RelaxRoom
            state={relaxState}
            someoneSpeaking={meSpeaking || peerSpeaking || peerSpeakingNet}
            onUpdateState={(next) => {
              setRelaxState(next);
              sigRef.current?.send({ t: 'shared', section: 'relax', data: next });
            }}
            onBackToHub={() => handleSelectActivity('hub')}
          />
        )}

        <CameraTile
          side="right"
          label={!leftIsMe ? myName : otherPeer?.name || 'Derecha'}
          isMe={!leftIsMe}
          online={!leftIsMe ? true : !!otherPeer}
          stream={!leftIsMe ? localStream : remoteStream}
          framing={!leftIsMe ? myFraming : peerFraming}
          onChangeFraming={!leftIsMe ? updateMyFraming : undefined}
          onSpeakingChange={!leftIsMe ? handleMeSpeakingChange : setPeerSpeaking}
          externalSpeaking={leftIsMe ? peerSpeakingNet : false}
          onAudioBlockedChange={leftIsMe ? setVoiceAudioBlocked : undefined}
          peerVolume={peerVolume}
          onChangePeerVolume={handleChangePeerVolume}
          peerMuted={peerMuted}
          onTogglePeerMuted={() => setPeerMuted((m) => !m)}
        />
      </div>

      {/* Reacciones flotantes */}
      <div className="floating-reacts" aria-hidden>
        {floatingReacts.map((r) => (
          <span key={r.id} className="float-emoji">
            {r.emoji}
          </span>
        ))}
      </div>

      <SourceDrawer
        open={showSources}
        storageReady={storageReady}
        subs={subs}
        onClose={() => setShowSources(false)}
        onSelectSource={handleSelectSource}
        onSelectLocalFile={handleSelectLocalFile}
        onSetSubs={(s) => {
          setSubs(s);
          sigRef.current?.send({ t: 'subs', subs: s });
        }}
      />

      <QualityDrawer
        open={showQuality}
        onClose={() => setShowQuality(false)}
        isMobile={mobile}
        source={source}
        preferredVersionKey={preferredVersionKey}
        onSelectVersionKey={setPreferredVersionKey}
        hlsLevels={hlsLevels}
        hlsLevel={hlsLevel}
        onSelectHlsLevel={setHlsLevel}
        movieCapBps={movieCapBps}
        onSelectMovieCap={setMovieCapBps}
        videoPreset={videoPreset}
        onSelectVideoPreset={(id) => {
          setVideoPreset(id);
          rtcRef.current?.setVideoPreset(id);
        }}
        audioPreset={audioPreset}
        onSelectAudioPreset={(id) => {
          setAudioPreset(id);
          rtcRef.current?.setAudioPreset(id);
        }}
        myFraming={myFraming}
        onChangeFraming={updateMyFraming}
        duckingEnabled={duckingEnabled}
        onToggleDucking={setDuckingEnabled}
        waitOnBuffer={waitOnBuffer}
        onToggleWaitOnBuffer={setWaitOnBuffer}
        stats={stats}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
      />

      {immersiveToast && (
        <div className="immersive-toast" aria-live="polite">
          {immersiveToast}
        </div>
      )}
    </div>
  );
};
