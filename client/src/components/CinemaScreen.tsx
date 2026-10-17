import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { decideSync, expectedPosition, PlaybackState } from '../lib/sync';
import { srtToVtt } from '../lib/subtitles';
import { DrawingCanvas, DrawEvent, DrawStroke } from './DrawingCanvas';

export interface MovieVersion {
  key: string;
  quality: string;
  file: string;
  size: number;
}

export interface RoomSource {
  kind: 'library' | 'file' | 'hls' | 'youtube' | 'local' | 'embed';
  title: string;
  url?: string;
  id?: string; // youtube id
  versions?: MovieVersion[];
  via?: string;
  size?: number;
  by?: string;
}

export interface RoomSubs {
  name: string;
  text: string;
  offset: number;
}

interface Props {
  source: RoomSource | null;
  playback: PlaybackState;
  subs: RoomSubs | null;
  serverNow: () => number;
  someoneSpeaking: boolean;
  duckingEnabled: boolean;
  waitOnBuffer: boolean;
  peerBuffering: boolean;
  preferredVersionKey: string | null;
  hlsLevel: number; // -1 = auto
  movieCapBps: number; // 0 = sin tope
  onLevelsLoaded: (levels: { index: number; label: string; bitrate: number }[]) => void;
  onSelectVersionKey: (key: string) => void;
  onEmitSync: (state: { playing: boolean; position: number }, reason: string) => void;
  onEmitBuffering: (buffering: boolean) => void;
  onOpenSources: () => void;
  localFileUrl: string | null;
  onPickLocalFile: (f: File) => void;
  drawingActive: boolean;
  drawingColor: string;
  peerName?: string;
  initialStrokes?: DrawStroke[];
  onEmitDraw: (ev: DrawEvent) => void;
  onRegisterDrawReceiver?: (receiver: (ev: DrawEvent) => void) => void;
  onCloseDrawing: () => void;
  onClearDrawing: () => void;
  onAutoplayBlockedChange?: (blocked: boolean) => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export const CinemaScreen: React.FC<Props> = ({
  source,
  playback,
  subs,
  serverNow,
  someoneSpeaking,
  duckingEnabled,
  waitOnBuffer,
  peerBuffering,
  preferredVersionKey,
  hlsLevel,
  movieCapBps,
  onLevelsLoaded,
  onSelectVersionKey,
  onEmitSync,
  onEmitBuffering,
  onOpenSources,
  localFileUrl,
  onPickLocalFile,
  drawingActive,
  drawingColor,
  peerName,
  initialStrokes,
  onEmitDraw,
  onRegisterDrawReceiver,
  onCloseDrawing,
  onClearDrawing,
  onAutoplayBlockedChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const suppressEventsUntil = useRef<number>(0);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentPos, setCurrentPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [trackBlobUrl, setTrackBlobUrl] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<any>(null);

  const unlockAudio = () => {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      if (v.paused && playback.playing) {
        v.play().catch(() => {});
      }
    }
    if (ytPlayerRef.current?.unMute) {
      try {
        ytPlayerRef.current.unMute();
        if (playback.playing) ytPlayerRef.current.playVideo?.();
      } catch {}
    }
    setAutoplayBlocked(false);
    onAutoplayBlockedChange?.(false);
  };

  useEffect(() => {
    if (!autoplayBlocked) return;
    const onGesture = () => unlockAudio();
    window.addEventListener('click', onGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, [autoplayBlocked, playback.playing]);

  const isCurrentlyPlaying = playback.playing || isPlaying;

  // Auto-hide automático de la barra a los 3 segundos cuando el video está reproduciéndose
  useEffect(() => {
    clearTimeout(hideTimer.current);
    if (isCurrentlyPlaying && !isScrubbing) {
      hideTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    } else {
      setControlsVisible(true);
    }
    return () => clearTimeout(hideTimer.current);
  }, [isCurrentlyPlaying, isScrubbing]);

  const bumpControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (isCurrentlyPlaying && !isScrubbing) {
      hideTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  const handleStageClick = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.cinema-controls, .ctrl-btn, .autoplay-banner, .drawing-toolbar, .drawing-overlay.is-active, .screen-empty')) {
      return;
    }
    if (controlsVisible && isCurrentlyPlaying) {
      setControlsVisible(false);
      clearTimeout(hideTimer.current);
    } else {
      bumpControls();
    }
  };

  // Resolver URL reproducible según el tipo de fuente
  useEffect(() => {
    let cancelled = false;
    onLevelsLoaded([]);
    if (!source) {
      setResolvedUrl(null);
      return;
    }
    if (source.kind === 'youtube') {
      setResolvedUrl(null);
      return;
    }
    if (source.kind === 'local') {
      setResolvedUrl(localFileUrl);
      return;
    }
    if (source.kind === 'library' && source.versions?.length) {
      const chosen =
        source.versions.find((v) => v.key === preferredVersionKey) ||
        source.versions[source.versions.length - 1]; // por defecto la más liviana si hay varias
      if (!preferredVersionKey && chosen) onSelectVersionKey(chosen.key);
      fetch('/api/play-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: chosen.key }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (!cancelled && j.url) setResolvedUrl(j.url);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
    setResolvedUrl(source.url || null);
  }, [source, preferredVersionKey, localFileUrl]);

  // Montar HLS o src nativo cuando cambia resolvedUrl
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !source || source.kind === 'youtube') return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (!resolvedUrl) {
      v.removeAttribute('src');
      v.load();
      return;
    }

    const savedPos = expectedPosition(playback, serverNow());
    suppressEventsUntil.current = Date.now() + 900;

    if (source.kind === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 25,
        backBufferLength: 20,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const lvls = hls.levels.map((l, idx) => ({
          index: idx,
          label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)} kbps`,
          bitrate: l.bitrate || 0,
        }));
        onLevelsLoaded(lvls);
        if (savedPos > 1) v.currentTime = savedPos;
        if (playback.playing) {
          v.play()
            .then(() => {
              setAutoplayBlocked(false);
              onAutoplayBlockedChange?.(false);
            })
            .catch(() => {
              v.muted = true;
              v.play().catch(() => {});
              setAutoplayBlocked(true);
              onAutoplayBlockedChange?.(true);
            });
        }
      });
    } else {
      v.src = resolvedUrl;
      v.onloadedmetadata = () => {
        setDuration(v.duration || 0);
        if (savedPos > 1 && savedPos < (v.duration || Infinity)) {
          v.currentTime = savedPos;
        }
        if (playback.playing) {
          v.play()
            .then(() => {
              setAutoplayBlocked(false);
              onAutoplayBlockedChange?.(false);
            })
            .catch(() => {
              v.muted = true;
              v.play().catch(() => {});
              setAutoplayBlocked(true);
              onAutoplayBlockedChange?.(true);
            });
        }
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedUrl, source?.kind]);

  // Aplicar selector de nivel HLS o tope de bitrate en vivo
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (hlsLevel >= 0) {
      hls.currentLevel = hlsLevel;
    } else if (movieCapBps > 0 && hls.levels?.length) {
      let maxIdx = 0;
      hls.levels.forEach((l, idx) => {
        if ((l.bitrate || 0) <= movieCapBps) maxIdx = idx;
      });
      hls.autoLevelCapping = maxIdx;
      hls.currentLevel = -1;
    } else {
      hls.autoLevelCapping = -1;
      hls.currentLevel = -1;
    }
  }, [hlsLevel, movieCapBps]);

  // Montar YouTube cuando source.kind === 'youtube'
  useEffect(() => {
    if (source?.kind !== 'youtube' || !source.id) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      return;
    }
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !ytHostRef.current) return;
      try {
        ytPlayerRef.current?.destroy();
      } catch {}
      ytPlayerRef.current = new YT.Player(ytHostRef.current, {
        videoId: source.id,
        playerVars: {
          autoplay: playback.playing ? 1 : 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.floor(expectedPosition(playback, serverNow())),
        },
        events: {
          onReady: (ev: any) => {
            setDuration(ev.target.getDuration() || 0);
            const target = expectedPosition(playback, serverNow());
            ev.target.seekTo(target, true);
            if (playback.playing) ev.target.playVideo();
            else ev.target.pauseVideo();
          },
          onStateChange: (ev: any) => {
            if (Date.now() < suppressEventsUntil.current) return;
            const p = ev.target;
            if (ev.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(p.getDuration() || 0);
              onEmitSync({ playing: true, position: p.getCurrentTime() || 0 }, 'play');
            } else if (ev.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              onEmitSync({ playing: false, position: p.getCurrentTime() || 0 }, 'pause');
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [source?.kind, source?.id]);

  // Subtítulos compartidos (.srt / .vtt -> WebVTT Blob URL)
  useEffect(() => {
    if (!subs?.text) {
      setTrackBlobUrl(null);
      return;
    }
    const vtt = srtToVtt(subs.text, subs.offset || 0);
    const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    setTrackBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [subs?.text, subs?.offset]);

  // Ducking automático: baja suavemente el volumen de la peli cuando alguien habla
  useEffect(() => {
    const eff = someoneSpeaking && duckingEnabled ? volume * 0.32 : volume;
    if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, eff));
    if (ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(eff * 100));
      } catch {}
    }
  }, [someoneSpeaking, duckingEnabled, volume]);

  // Bucle de sincronización continua (corrige deriva con playbackRate o seek)
  useEffect(() => {
    const syncOnce = () => {
      const now = serverNow();
      if (source?.kind === 'youtube') {
        const p = ytPlayerRef.current;
        if (!p || typeof p.getCurrentTime !== 'function') return;
        const pos = Number(p.getCurrentTime()) || 0;
        setCurrentPos(pos);
        setDuration(Number(p.getDuration?.()) || duration);
        const target = expectedPosition(playback, now);
        if (Math.abs(target - pos) > 1.8) {
          suppressEventsUntil.current = Date.now() + 700;
          p.seekTo(target, true);
        }
        const state = p.getPlayerState?.();
        const shouldPlay = playback.playing && !(waitOnBuffer && peerBuffering);
        if (shouldPlay && state !== 1) {
          suppressEventsUntil.current = Date.now() + 700;
          p.playVideo?.();
        } else if (!shouldPlay && state === 1) {
          suppressEventsUntil.current = Date.now() + 700;
          p.pauseVideo?.();
        }
        return;
      }

      const v = videoRef.current;
      if (!v || !resolvedUrl) return;
      setCurrentPos(v.currentTime || 0);
      if (v.duration && Number.isFinite(v.duration)) setDuration(v.duration);

      const shouldPlay = playback.playing && !(waitOnBuffer && peerBuffering);
      const dec = decideSync(v.currentTime || 0, { ...playback, playing: shouldPlay }, now);

      if (dec.action === 'seek') {
        suppressEventsUntil.current = Date.now() + 600;
        v.currentTime = dec.target;
        if (v.playbackRate !== 1) v.playbackRate = 1;
      } else if (dec.action === 'rate') {
        if (Math.abs(v.playbackRate - dec.rate) > 0.005) v.playbackRate = dec.rate;
      } else if (v.playbackRate !== 1) {
        v.playbackRate = 1;
      }

      if (shouldPlay && v.paused) {
        suppressEventsUntil.current = Date.now() + 600;
        v.play()
          .then(() => {
            setAutoplayBlocked(false);
            onAutoplayBlockedChange?.(false);
          })
          .catch(() => {
            v.muted = true;
            v.play().catch(() => {});
            setAutoplayBlocked(true);
            onAutoplayBlockedChange?.(true);
          });
      } else if (!shouldPlay && !v.paused) {
        suppressEventsUntil.current = Date.now() + 600;
        v.pause();
      }
      setIsPlaying(!v.paused);
    };

    syncOnce();
    const t = setInterval(syncOnce, 500);
    return () => clearInterval(t);
  }, [playback, resolvedUrl, source?.kind, waitOnBuffer, peerBuffering]);

  // Fullscreen support
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = document.querySelector('.screen-bezel') as any;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  };

  // Scrubber behavior (evita que la barra salte o pelee contra el dedo)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Porcentaje cargado en buffer
  const [bufferedPct, setBufferedPct] = useState(0);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const updateBuf = () => {
      if (!v.duration || !v.buffered.length) {
        setBufferedPct(0);
        return;
      }
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

  // Acciones de usuario en los controles compartidos (funcionan igual desde compu o celular)
  const togglePlay = () => {
    const nextPlaying = !playback.playing;
    let pos = currentPos;
    if (source?.kind === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
      pos = ytPlayerRef.current.getCurrentTime() || 0;
    } else if (videoRef.current) {
      pos = videoRef.current.currentTime || 0;
    }
    suppressEventsUntil.current = Date.now() + 600;
    if (videoRef.current) {
      if (nextPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    if (ytPlayerRef.current) {
      if (nextPlaying) ytPlayerRef.current.playVideo?.();
      else ytPlayerRef.current.pauseVideo?.();
    }
    onEmitSync({ playing: nextPlaying, position: pos }, nextPlaying ? 'play' : 'pause');
  };

  const seekTo = (pos: number) => {
    const clamped = Math.max(0, Math.min(duration || Infinity, pos));
    suppressEventsUntil.current = Date.now() + 700;
    if (videoRef.current) videoRef.current.currentTime = clamped;
    if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(clamped, true);
    setCurrentPos(clamped);
    onEmitSync({ playing: playback.playing, position: clamped }, 'seek');
  };

  const [prevVol, setPrevVol] = useState(1);
  const toggleMute = () => {
    if (volume > 0) {
      setPrevVol(volume);
      setVolume(0);
    } else {
      setVolume(prevVol > 0 ? prevVol : 1);
    }
  };

  const handleTimelinePointerDown = (e: React.PointerEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const clientX = e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = ratio * duration;
    setIsScrubbing(true);
    setScrubPos(target);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleTimelinePointerMove = (e: React.PointerEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const clientX = e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = ratio * duration;
    setHoverX(Math.max(0, Math.min(rect.width, clientX - rect.left)));
    setHoverPos(target);
    if (isScrubbing) {
      setScrubPos(target);
    }
  };

  const handleTimelinePointerUp = (e: React.PointerEvent) => {
    if (isScrubbing) {
      seekTo(scrubPos);
      setTimeout(() => setIsScrubbing(false), 200);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleTimelinePointerLeave = () => {
    if (!isScrubbing) setHoverPos(null);
  };

  // Atajos de teclado en PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!source || source.kind === 'embed') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(currentPos - 10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(currentPos + 10);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [source, playback.playing, currentPos, volume, duration]);

  const displayPos = isScrubbing ? scrubPos : currentPos;
  const progressPct = duration > 0 ? (displayPos / duration) * 100 : 0;

  return (
    <main
      className={`cinema-stage ${controlsVisible ? 'show-ui' : 'hide-ui'}`}
      onMouseMove={bumpControls}
      onClick={handleStageClick}
    >
      <div className="screen-bezel">
        <div className="screen-glow" />

        {!source && (
          <div className="screen-empty">
            <div className="empty-marquee">SALA DRUO</div>
            <h2>La pantalla está lista</h2>
            <p>
              Elegí una película de la biblioteca, subí un archivo o pegá un link de Cuevana / YouTube / MediaFire / Drive.
              Lo que pongas, pauses o adelantes se sincroniza al instante en los dos.
            </p>
            <button type="button" className="cta-primary" onClick={onOpenSources}>
              🎬 Elegir o subir película
            </button>
          </div>
        )}

        {source?.kind === 'local' && !localFileUrl && (
          <div className="screen-empty">
            <div className="empty-marquee">ARCHIVO LOCAL SINCRONIZADO</div>
            <h2>{source.title}</h2>
            <p>Abrí el mismo archivo de video en tu dispositivo para verlo con 0 consumo de internet.</p>
            <label className="cta-primary file-label">
              📂 Elegir el archivo en este dispositivo
              <input
                type="file"
                accept="video/*,.mkv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickLocalFile(f);
                }}
              />
            </label>
          </div>
        )}

        {source?.kind === 'youtube' && (
          <div className="yt-wrap">
            <div ref={ytHostRef} className="yt-host" />
          </div>
        )}

        {source?.kind === 'embed' && source.url && (
          <div className="embed-wrap">
            <iframe
              src={source.url}
              className="cinema-embed"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
            <div className="embed-helper-banner">
              <span>🎬 Reproductor Cuevana listo</span>
              <small>Usá los controles dentro del video para reproducir, pausar o cambiar audio</small>
            </div>
          </div>
        )}

        {source && source.kind !== 'youtube' && source.kind !== 'embed' && (
          <video
            ref={videoRef}
            className={`cinema-video ${!resolvedUrl ? 'is-hidden' : ''}`}
            playsInline
            crossOrigin="anonymous"
            onWaiting={() => onEmitBuffering(true)}
            onPlaying={() => {
              onEmitBuffering(false);
              setIsPlaying(true);
            }}
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
              if (videoRef.current) {
                onEmitSync({ playing: true, position: videoRef.current.currentTime }, 'play');
              }
            }}
          >
            {trackBlobUrl && <track kind="subtitles" src={trackBlobUrl} srcLang="es" label={subs?.name || 'Subtítulos'} default />}
          </video>
        )}

        {autoplayBlocked && (
          <button
            type="button"
            className="autoplay-banner"
            style={{ zIndex: 30 }}
            onClick={(e) => {
              e.stopPropagation();
              unlockAudio();
            }}
          >
            🔊 Tocá acá para activar el sonido de la película
          </button>
        )}

        {waitOnBuffer && peerBuffering && (
          <div className="buffer-pill">⏳ Esperando un segundo a que cargue en el otro dispositivo…</div>
        )}

        <DrawingCanvas
          active={drawingActive}
          color={drawingColor}
          width={4}
          peerName={peerName}
          initialStrokes={initialStrokes}
          onEmitDraw={onEmitDraw}
          onRegisterReceiver={onRegisterDrawReceiver}
          onCloseDrawing={onCloseDrawing}
          onClearDrawing={onClearDrawing}
        />

        {source && source.kind !== 'embed' && (
          <div className="cinema-controls" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ctrl-btn ctrl-play-btn"
              onClick={togglePlay}
              title={playback.playing || isPlaying ? 'Pausar para ambos (Espacio)' : 'Reproducir para ambos (Espacio)'}
              aria-label={playback.playing || isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {playback.playing || isPlaying ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M7 5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-3 0v-11A1.5 1.5 0 0 1 7 5zm10 0a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-3 0v-11A1.5 1.5 0 0 1 17 5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={() => seekTo(currentPos - 10)}
              title="Retroceder 10 segundos (←)"
              aria-label="Retroceder 10 segundos"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12a8 8 0 0 1 14.93-3.93M4 12V7m0 5H9" />
                <text x="12" y="15" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">10</text>
              </svg>
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={() => seekTo(currentPos + 10)}
              title="Adelantar 10 segundos (→)"
              aria-label="Adelantar 10 segundos"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12a8 8 0 0 0-14.93-3.93M20 12V7m0 5h-5" />
                <text x="12" y="15" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">10</text>
              </svg>
            </button>

            <div
              ref={timelineRef}
              className={`ctrl-timeline-wrap ${isScrubbing ? 'is-scrubbing' : ''}`}
              onPointerDown={handleTimelinePointerDown}
              onPointerMove={handleTimelinePointerMove}
              onPointerUp={handleTimelinePointerUp}
              onPointerCancel={handleTimelinePointerUp}
              onPointerLeave={handleTimelinePointerLeave}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={displayPos}
              tabIndex={0}
            >
              <div className="ctrl-timeline-track">
                <div className="ctrl-timeline-buffer" style={{ width: `${bufferedPct}%` }} />
                <div className="ctrl-timeline-progress" style={{ width: `${progressPct}%` }} />
                <div className="ctrl-timeline-thumb" style={{ left: `${progressPct}%` }} />
              </div>

              {hoverPos !== null && duration > 0 && (
                <div className="ctrl-time-bubble" style={{ left: `${hoverX}px` }}>
                  {fmtTime(hoverPos)}
                </div>
              )}
            </div>

            <span className="ctrl-time">
              {fmtTime(displayPos)} <span className="ctrl-time-sep">/</span> {fmtTime(duration)}
            </span>

            <div className="ctrl-vol-wrap">
              <button
                type="button"
                className="ctrl-btn ctrl-vol-btn"
                onClick={toggleMute}
                title={volume === 0 ? 'Activar sonido (M)' : 'Silenciar (M)'}
                aria-label="Volumen"
              >
                {volume === 0 ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                className="ctrl-vol"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                title={`Volumen: ${Math.round(volume * 100)}%`}
                aria-label="Ajustar volumen"
              />
            </div>

            <button
              type="button"
              className="ctrl-btn ctrl-fs-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
              aria-label="Pantalla completa"
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6m0 0v6m0-6L3 21m17-11h-6m0 0V4m0 6l7-7M14 14h6m-6 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
