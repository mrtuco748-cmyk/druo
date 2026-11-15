// Procesador vocal remoto con compuerta de ruido inteligente
import { getSharedAudioContext } from './audioContext';
import { buildVoiceAudioGraph } from './remoteVoiceGraph';

export interface RemoteVoiceChain {
  setGain: (gainValue: number) => void;
  destroy: () => void;
}

export function createRemoteVoiceProcessor(
  audioTrack: MediaStreamTrack,
  initialGain: number
): RemoteVoiceChain | null {
  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  try {
    const g = buildVoiceAudioGraph(ctx, audioTrack, initialGain);
    const timeBuf = new Uint8Array(g.analyser.fftSize);

    let gateOpen = true;
    let holdCounter = 0;
    let noiseFloor = 3.5;

    const gateTimer = setInterval(() => {
      if (ctx.state !== 'running' || !audioTrack.enabled) return;

      g.analyser.getByteTimeDomainData(timeBuf);
      let sumSq = 0;
      for (let i = 0; i < timeBuf.length; i++) {
        const sample = (timeBuf[i] - 128) / 128;
        sumSq += sample * sample;
      }
      const rms = Math.sqrt(sumSq / timeBuf.length) * 100;
      const voiceThreshold = Math.max(2.6, noiseFloor * 1.55);

      if (rms > voiceThreshold) {
        holdCounter = 14;
        if (!gateOpen) {
          gateOpen = true;
          try { g.gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015); }
          catch { g.gateGain.gain.value = 1.0; }
        }
      } else {
        if (holdCounter === 0) {
          noiseFloor = noiseFloor * 0.96 + rms * 0.04;
          noiseFloor = Math.max(1.0, Math.min(9.0, noiseFloor));
        }

        if (holdCounter > 0) {
          holdCounter--;
        } else if (gateOpen) {
          gateOpen = false;
          try { g.gateGain.gain.setTargetAtTime(0.005, ctx.currentTime, 0.035); }
          catch { g.gateGain.gain.value = 0.005; }
        }
      }
    }, 30);

    return {
      setGain: (val: number) => {
        const clamped = Math.max(0, Math.min(3.5, val));
        try { g.gainNode.gain.setTargetAtTime(clamped, ctx.currentTime, 0.015); }
        catch { g.gainNode.gain.value = clamped; }
      },
      destroy: () => {
        clearInterval(gateTimer);
        try {
          g.srcNode.disconnect(); g.hpFilter.disconnect(); g.mudFilter.disconnect();
          g.presenceFilter.disconnect(); g.lpFilter.disconnect(); g.analyser.disconnect();
          g.gateGain.disconnect(); g.vocalComp.disconnect(); g.gainNode.disconnect();
          g.limiter.disconnect();
        } catch {}
      },
    };
  } catch (e) {
    console.warn('[voiceEngine] Error en cadena vocal remota:', e);
    return null;
  }
}
