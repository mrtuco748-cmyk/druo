import React, { useEffect, useRef, useState } from 'react';

export type AmbienceId = 'off' | 'rain' | 'fire' | 'waves' | 'lofi';

export interface RelaxState {
  ambience: AmbienceId;
  moodTitle: string;
  timerEndsAt: number | null;
  timerDurationSec: number;
}

export const DEFAULT_RELAX_STATE: RelaxState = {
  ambience: 'rain',
  moodTitle: '🌙 Charlando tranquilos antes de dormir',
  timerEndsAt: null,
  timerDurationSec: 25 * 60,
};

const AMBIENCES: { id: AmbienceId; emoji: string; label: string; desc: string }[] = [
  { id: 'off', emoji: '🔇', label: 'En silencio', desc: 'Solo nuestras voces' },
  { id: 'rain', emoji: '🌧️', label: 'Lluvia suave', desc: 'Gotas cálidas en la ventana' },
  { id: 'fire', emoji: '🔥', label: 'Fogata tibia', desc: 'Leña crepitando de fondo' },
  { id: 'waves', emoji: '🌊', label: 'Brisa del mar', desc: 'Olas tranquilas de noche' },
  { id: 'lofi', emoji: '🎹', label: 'Acordes Cozy', desc: 'Armonía suave relajante' },
];

const MOOD_PRESETS = [
  '🌙 Charlando tranquilos antes de dormir',
  '📚 Estudiando / Trabajando juntos (Study with Me)',
  '☕ Tomando algo rico y poniéndonos al día',
  '💤 Siesta / Descansando acompañados',
];

interface Props {
  state: RelaxState;
  someoneSpeaking: boolean;
  onUpdateState: (next: RelaxState) => void;
  onBackToHub: () => void;
}

export const RelaxRoom: React.FC<Props> = ({
  state,
  someoneSpeaking,
  onUpdateState,
  onBackToHub,
}) => {
  // Todos los hooks al inicio
  const [localVol, setLocalVol] = useState(0.35);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const s: RelaxState = {
    ...DEFAULT_RELAX_STATE,
    ...state,
  };

  // Reloj regresivo sincronizado
  useEffect(() => {
    if (!s.timerEndsAt) {
      setSecondsLeft(s.timerDurationSec || 1500);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((s.timerEndsAt! - Date.now()) / 1000));
      setSecondsLeft(rem);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [s.timerEndsAt, s.timerDurationSec]);

  // Generador Web Audio procedural de ambientes relajantes (0 dependencias externas)
  useEffect(() => {
    if (s.ambience === 'off') {
      try {
        audioCtxRef.current?.close();
      } catch {}
      audioCtxRef.current = null;
      masterGainRef.current = null;
      return;
    }

    let ctx: AudioContext | null = null;
    let intervalId: any = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      audioCtxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = someoneSpeaking ? localVol * 0.25 : localVol;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      if (s.ambience === 'rain' || s.ambience === 'fire' || s.ambience === 'waves') {
        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = s.ambience === 'fire' ? 'bandpass' : 'lowpass';
        filter.frequency.value = s.ambience === 'rain' ? 950 : s.ambience === 'fire' ? 420 : 320;

        whiteNoise.connect(filter);
        filter.connect(master);
        whiteNoise.start(0);

        if (s.ambience === 'waves') {
          let t = 0;
          intervalId = setInterval(() => {
            t += 0.15;
            filter.frequency.setTargetAtTime(280 + Math.sin(t) * 180, ctx!.currentTime, 0.2);
          }, 150);
        }
      } else if (s.ambience === 'lofi') {
        const chords = [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0],  // Am7
          [174.61, 220.0, 261.63, 349.23], // Fmaj7
          [196.0, 246.94, 293.66, 349.23], // G7
        ];
        let idx = 0;
        const playChord = () => {
          if (!ctx || ctx.state !== 'running') return;
          const notes = chords[idx % chords.length];
          idx++;
          notes.forEach((freq) => {
            const osc = ctx!.createOscillator();
            const g = ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.001, ctx!.currentTime);
            g.gain.exponentialRampToValueAtTime(0.04, ctx!.currentTime + 0.8);
            g.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 3.8);
            osc.connect(g);
            g.connect(master);
            osc.start();
            osc.stop(ctx!.currentTime + 3.9);
          });
        };
        ctx.resume().then(playChord).catch(() => {});
        intervalId = setInterval(playChord, 4000);
      }
    } catch {}

    return () => {
      clearInterval(intervalId);
      try {
        ctx?.close();
      } catch {}
    };
  }, [s.ambience]);

  // Auto-ducking también en el sonido ambiente cuando hablan
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const eff = someoneSpeaking ? localVol * 0.25 : localVol;
      masterGainRef.current.gain.setTargetAtTime(eff, audioCtxRef.current.currentTime, 0.12);
    }
  }, [localVol, someoneSpeaking]);

  const fmtTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const r = String(sec % 60).padStart(2, '0');
    return `${String(m).padStart(2, '0')}:${r}`;
  };

  const startTimer = (mins: number) => {
    const dur = mins * 60;
    onUpdateState({
      ...s,
      timerDurationSec: dur,
      timerEndsAt: Date.now() + dur * 1000,
    });
  };

  const stopTimer = () => {
    onUpdateState({
      ...s,
      timerEndsAt: null,
    });
  };

  return (
    <main className="cinema-stage relax-stage">
      <div className="screen-bezel cute-activity-bezel relax-bezel">
        <div className="activity-header-bar">
          <button type="button" className="studio-home-btn" onClick={onBackToHub}>
            🏠 Menú
          </button>
          <span className="studio-badge-title">☕ Rincón Relax & Study With Me</span>
        </div>

        <div className="relax-content-grid">
          {/* Estado compartido y Reloj Pomodoro */}
          <div className="relax-card">
            <span className="cute-pill-tag">✨ Nuestro Momento</span>
            <h2 className="relax-mood-heading">{s.moodTitle}</h2>

            <div className="relax-mood-chips">
              {MOOD_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`relax-mood-chip ${s.moodTitle === m ? 'active' : ''}`}
                  onClick={() => onUpdateState({ ...s, moodTitle: m })}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="relax-timer-display">{fmtTimer(secondsLeft)}</div>

            <div className="relax-timer-btns">
              <button type="button" className="wheel-preset-btn" onClick={() => startTimer(15)}>
                ⏱️ 15 min
              </button>
              <button type="button" className="wheel-preset-btn" onClick={() => startTimer(25)}>
                🍅 25 min (Pomodoro)
              </button>
              <button type="button" className="wheel-preset-btn" onClick={() => startTimer(45)}>
                📚 45 min
              </button>
              {s.timerEndsAt && (
                <button type="button" className="wheel-preset-btn danger" onClick={stopTimer}>
                  ⏹️ Pausar reloj
                </button>
              )}
            </div>
          </div>

          {/* Sonidos Ambientales Sincronizados */}
          <div className="relax-card">
            <h4>🎧 Sonido Ambiental Compartido</h4>
            <p className="relax-hint">
              Se baja solito cuando cualquiera de los dos habla para que se escuchen perfecto 💕
            </p>

            <div className="ambience-grid">
              {AMBIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ambience-btn ${s.ambience === a.id ? 'active' : ''}`}
                  onClick={() => onUpdateState({ ...s, ambience: a.id })}
                >
                  <span className="amb-emoji">{a.emoji}</span>
                  <div>
                    <strong>{a.label}</strong>
                    <small>{a.desc}</small>
                  </div>
                </button>
              ))}
            </div>

            <label className="relax-vol-slider">
              <span>🔉 Volumen del ambiente en tu dispositivo: {Math.round(localVol * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localVol}
                onChange={(e) => setLocalVol(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>
    </main>
  );
};
