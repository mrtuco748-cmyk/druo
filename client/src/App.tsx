import React, { useEffect, useRef, useState } from 'react';
import { CameraTile, CamFraming } from './components/CameraTile';
import { CinemaScreen, RoomSource, RoomSubs } from './components/CinemaScreen';
import { DrawEvent, DrawStroke } from './components/DrawingCanvas';
import { OptionsMenu } from './components/OptionsMenu';
import { QualityDrawer } from './components/QualityDrawer';
import { SourceDrawer } from './components/SourceDrawer';
import { AudioPresetId, VideoPresetId } from './lib/quality';
import { CallStats, PeerCall } from './lib/rtc';
import { Signaling } from './lib/signaling';
import { PlaybackState } from './lib/sync';

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
  const [duckingEnabled, setDuckingEnabled] = useState(true); // Activado por defecto para que baje la peli cuando hablan
  const [peerVolume, setPeerVolume] = useState<number>(() => {
    const saved = Number(localStorage.getItem('druo.peerVolume'));
    return saved > 0 && saved <= 4.0 ? saved : 2.0; // Por defecto 200% para que las voces se escuchen siempre más fuerte
  });
  const [peerMuted, setPeerMuted] = useState(false);
  const [waitOnBuffer, setWaitOnBuffer] = useState(true);
  const [peerBuffering, setPeerBuffering] = useState(false);

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

  const [viewMode, setViewMode] = useState<'cinema' | 'call-only' | 'focus-movie' | 'duo'>(() => {
    return (localStorage.getItem('druo.viewMode') as any) || 'cinema';
  });

  const handleSelectViewMode = (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => {
    setViewMode(mode);
    localStorage.setItem('druo.viewMode', mode);
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
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const dummy = new AC();
        dummy.resume().catch(() => {});
      }
    } catch {}
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
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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
        } else if (m.t === 'react' && m.emoji) {
          spawnReaction(m.emoji);
        } else if (m.t === 'draw') {
          drawReceiverRef.current?.(m);
        }
      },
      (online) => setWsOnline(online)
    );
    sigRef.current = sig;

    const rtc = new PeerCall(
      myId,
      (data) => sig.send({ t: 'signal', data }),
      (rem) => setRemoteStream(new MediaStream(rem.getTracks())),
      (st) => setStats(st)
    );
    rtcRef.current = rtc;
    await rtc.init(iceRes.iceServers || [], stream);
  };

  // Sincronizar con el otro peer cuando entra o sale de la sala
  useEffect(() => {
    const other = peers.find((p) => p.id !== myId);
    rtcRef.current?.setRemotePeer(other ? other.id : null, other?.session);
    if (!other) setPeerBuffering(false);
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
    sigRef.current?.send({ t: 'source', source: src });
  };

  const handleSelectLocalFile = (file: File, announce: boolean) => {
    if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);
    if (announce) {
      const src: RoomSource = { kind: 'local', title: file.name, size: file.size };
      setSource(src);
      sigRef.current?.send({ t: 'source', source: src });
    }
  };

  const handleEmitSync = (state: { playing: boolean; position: number }, reason: string) => {
    const now = sigRef.current?.clock.now() || Date.now();
    const next: PlaybackState = {
      playing: state.playing,
      position: state.position,
      rate: 1,
      updatedAt: now,
      by: myId,
    };
    setPlayback(next);
    sigRef.current?.send({ t: 'sync', state, at: now, reason });
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
      <div className="lobby-curtain">
        <div className="lobby-card">
          <div className="lobby-logo">DRUO</div>
          <p className="lobby-sub">Sala privada de cine para dos</p>

          <div className="lobby-fields">
            <label className="field-block">
              <span>Tu nombre en la butaca</span>
              <input
                type="text"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                maxLength={24}
              />
            </label>

            <div className="seat-picker">
              <button
                type="button"
                className={`seat-btn ${mySeat === 'left' ? 'active' : ''}`}
                onClick={() => setMySeat('left')}
              >
                <span>👈 Izquierda</span>
                <small>Tu cámara a la izq (PC)</small>
              </button>
              <button
                type="button"
                className={`seat-btn ${mySeat === 'right' ? 'active' : ''}`}
                onClick={() => setMySeat('right')}
              >
                <span>Derecha 👉</span>
                <small>Su cámara a la der (Celu)</small>
              </button>
            </div>
          </div>

          <button type="button" className="cta-enter" onClick={enterTheater}>
            🍿 Entrar a la sala
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`theater-shell view-${viewMode}`}>
      {/* Barra superior discreta */}
      <header className="theater-topbar">
        <div className="brand-cluster">
          <span className="brand-title">DRUO</span>
          <span className={`conn-pill ${wsOnline ? 'ok' : 'warn'}`}>
            {wsOnline ? (otherPeer ? '2/2 en sala' : '1/2 esperando') : 'Reconectando…'}
          </span>
          <span className="conn-pill ok" title="Keep-alive activo para evitar que Render se suspenda mientras ven la peli">
            ⚡ Sala activa
          </span>
          {source && <span className="now-playing">🎞️ {source.title}</span>}
        </div>

        <div className="action-cluster">
          {/* Reacciones rápidas */}
          <div className="react-bar">
            {['❤️', '😂', '🥰'].map((em) => (
              <button
                key={em}
                type="button"
                className="react-btn"
                onClick={() => {
                  spawnReaction(em);
                  sigRef.current?.send({ t: 'react', emoji: em });
                }}
              >
                {em}
              </button>
            ))}
          </div>

          {/* Botón rápido de mic */}
          <button
            type="button"
            className={`top-btn quick-mic-btn ${myFraming.mic ? '' : 'is-off'}`}
            onClick={toggleMic}
            title={myFraming.mic ? 'Silenciar micrófono' : 'Activar micrófono'}
          >
            {myFraming.mic ? '🎙️' : '🔇'}
          </button>

          {/* Único botón de Menú desplegable */}
          <button
            type="button"
            className={`top-btn menu-toggle-btn ${showMenu ? 'accent' : ''}`}
            onClick={() => setShowMenu((v) => !v)}
            title="Abrir menú de opciones, modos y películas"
          >
            <span className="menu-btn-icon">☰</span>
            <span className="menu-btn-label">Menú</span>
          </button>
        </div>
      </header>

      {/* Menú desplegable unificado */}
      <OptionsMenu
        open={showMenu}
        onClose={() => setShowMenu(false)}
        viewMode={viewMode}
        onSelectViewMode={handleSelectViewMode}
        onOpenSources={() => setShowSources(true)}
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
        <button type="button" className="master-audio-banner" onClick={unlockAllAudio}>
          🔊 Tocá acá para activar el sonido (Película y Voz)
        </button>
      )}

      {/* Botón flotante para volver al cine en Solo Videollamada */}
      {viewMode === 'call-only' && (
        <button
          type="button"
          className="call-return-btn"
          onClick={() => handleSelectViewMode('cinema')}
          title="Volver a la pantalla de cine"
        >
          🎬 Volver al Cine
        </button>
      )}

      {/* Escenario principal: Cámara Izquierda | Pantalla de Cine | Cámara Derecha */}
      <div className="theater-grid">

        <CameraTile
          side="left"
          label={leftIsMe ? myName : otherPeer?.name || 'Izquierda'}
          isMe={leftIsMe}
          online={leftIsMe ? true : !!otherPeer}
          stream={leftIsMe ? localStream : remoteStream}
          framing={leftIsMe ? myFraming : peerFraming}
          onChangeFraming={leftIsMe ? updateMyFraming : undefined}
          onSpeakingChange={leftIsMe ? setMeSpeaking : setPeerSpeaking}
          onAudioBlockedChange={!leftIsMe ? setVoiceAudioBlocked : undefined}
          peerVolume={peerVolume}
          onChangePeerVolume={handleChangePeerVolume}
          peerMuted={peerMuted}
          onTogglePeerMuted={() => setPeerMuted((m) => !m)}
        />

        <CinemaScreen
          source={source}
          playback={playback}
          subs={subs}
          serverNow={() => sigRef.current?.clock.now() || Date.now()}
          someoneSpeaking={meSpeaking || peerSpeaking}
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

        <CameraTile
          side="right"
          label={!leftIsMe ? myName : otherPeer?.name || 'Derecha'}
          isMe={!leftIsMe}
          online={!leftIsMe ? true : !!otherPeer}
          stream={!leftIsMe ? localStream : remoteStream}
          framing={!leftIsMe ? myFraming : peerFraming}
          onChangeFraming={!leftIsMe ? updateMyFraming : undefined}
          onSpeakingChange={!leftIsMe ? setMeSpeaking : setPeerSpeaking}
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
    </div>
  );
};
