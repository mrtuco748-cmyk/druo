import { useEffect, useRef } from 'react';
import { AmbienceId } from './types';

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const out = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < out.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.04;
    b6 = w * 0.115926;
  }
  return buf;
}

const LOFI_CHORDS = [
  [261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 349.23], [196.0, 246.94, 293.66, 349.23],
];

export function useAmbienceAudio(ambience: AmbienceId, localVol: number, someoneSpeaking: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (ambience === 'off') {
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null; masterGainRef.current = null;
      return;
    }
    let ctx: AudioContext | null = null, intervalId: any = null;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC(); audioCtxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = someoneSpeaking ? localVol * 0.25 : localVol;
      master.connect(ctx.destination); masterGainRef.current = master;

      if (ambience === 'rain' || ambience === 'fire' || ambience === 'waves') {
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = createPinkNoiseBuffer(ctx);
        whiteNoise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = ambience === 'fire' ? 'bandpass' : 'lowpass';
        filter.frequency.value = ambience === 'rain' ? 950 : ambience === 'fire' ? 420 : 320;
        whiteNoise.connect(filter).connect(master);
        whiteNoise.start(0);

        if (ambience === 'waves') {
          let t = 0;
          intervalId = setInterval(() => {
            t += 0.15;
            filter.frequency.setTargetAtTime(280 + Math.sin(t) * 180, ctx!.currentTime, 0.2);
          }, 150);
        }
      } else if (ambience === 'lofi') {
        let idx = 0;
        const playChord = () => {
          if (!ctx || ctx.state !== 'running') return;
          const notes = LOFI_CHORDS[idx % LOFI_CHORDS.length]; idx++;
          notes.forEach((freq) => {
            const osc = ctx!.createOscillator(), g = ctx!.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            g.gain.setValueAtTime(0.001, ctx!.currentTime);
            g.gain.exponentialRampToValueAtTime(0.04, ctx!.currentTime + 0.8);
            g.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 3.8);
            osc.connect(g).connect(master);
            osc.start(); osc.stop(ctx!.currentTime + 3.9);
          });
        };
        ctx.resume().then(playChord).catch(() => {});
        intervalId = setInterval(playChord, 4000);
      }
    } catch {}
    return () => { clearInterval(intervalId); try { ctx?.close(); } catch {} };
  }, [ambience]);

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const eff = someoneSpeaking ? localVol * 0.25 : localVol;
      masterGainRef.current.gain.setTargetAtTime(eff, audioCtxRef.current.currentTime, 0.12);
    }
  }, [localVol, someoneSpeaking]);
}
