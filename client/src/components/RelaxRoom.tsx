import React, { useEffect, useRef, useState } from 'react';
import {
  IconFire,
  IconHome,
  IconMicOff,
  IconMusic,
  IconPause,
  IconPlay,
  IconRain,
  IconVolume,
  IconWaves,
} from './KawaiiIcons';

export type AmbienceId = 'off' | 'rain' | 'fire' | 'waves' | 'lofi';

export interface RelaxState {
  ambience: AmbienceId;
  moodTitle: string;
  timerEndsAt: number | null;
  timerDurationSec: number;
}

export const DEFAULT_RELAX_STATE: RelaxState = {
  ambience: 'rain',
  moodTitle: 'Cozy',
  timerEndsAt: null,
  timerDurationSec: 25 * 60,
};

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
  const [localVol, setLocalVol] = useState(0.35);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const s: RelaxState = {
    ...DEFAULT_RELAX_STATE,
    ...state,
  };

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
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
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
          [261.63, 329.63, 392.0, 493.88],
          [220.0, 261.63, 329.63, 392.0],
          [174.61, 220.0, 261.63, 349.23],
          [196.0, 246.94, 293.66, 349.23],
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

  const toggleTimer = () => {
    if (s.timerEndsAt) {
      onUpdateState({ ...s, timerEndsAt: null });
    } else {
      const dur = s.timerDurationSec || 1500;
      onUpdateState({ ...s, timerEndsAt: Date.now() + dur * 1000 });
    }
  };

  const setMins = (mins: number) => {
    const dur = mins * 60;
    onUpdateState({
      ...s,
      timerDurationSec: dur,
      timerEndsAt: Date.now() + dur * 1000,
    });
  };

  const ambiences: { id: AmbienceId; icon: React.ReactNode; color: string }[] = [
    { id: 'off', icon: <IconMicOff size={24} />, color: '#361c38' },
    { id: 'rain', icon: <IconRain size={24} />, color: '#1d2d42' },
    { id: 'fire', icon: <IconFire size={24} />, color: '#3d251e' },
    { id: 'waves', icon: <IconWaves size={24} />, color: '#18362e' },
    { id: 'lofi', icon: <IconMusic size={24} />, color: '#3d1b2e' },
  ];

  return (
    <main className="cinema-stage relax-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        <div className="kawaii-top-nav">
          <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
            <IconHome size={20} />
          </button>
        </div>

        <div className="kawaii-relax-center">
          {/* Reloj Minimalista */}
          <div className="kawaii-timer-circle">
            <div className="kawaii-timer-digits">{fmtTimer(secondsLeft)}</div>
            <div className="kawaii-timer-Quick">
              {[15, 25, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`kawaii-num-pill ${s.timerDurationSec === m * 60 ? 'active' : ''}`}
                  onClick={() => setMins(m)}
                >
                  {m}
                </button>
              ))}
              <button type="button" className="kawaii-action-circle small" onClick={toggleTimer}>
                {s.timerEndsAt ? <IconPause size={18} /> : <IconPlay size={18} />}
              </button>
            </div>
          </div>

          {/* Botones Circulares de Sonido Ambiental (Solo Iconos SVG) */}
          <div className="kawaii-ambience-row">
            {ambiences.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`kawaii-amb-circle ${s.ambience === a.id ? 'active' : ''}`}
                style={{ '--amb-bg': a.color } as React.CSSProperties}
                onClick={() => onUpdateState({ ...s, ambience: a.id })}
              >
                {a.icon}
              </button>
            ))}
          </div>

          {/* Slider de Volumen Ambiental con Icono */}
          <div className="kawaii-icon-slider narrow">
            <IconVolume size={18} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={localVol}
              onChange={(e) => setLocalVol(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </main>
  );
};
