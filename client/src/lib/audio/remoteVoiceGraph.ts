// Construcción del grafo de audio para procesamiento vocal remoto
export interface VoiceAudioGraph {
  srcNode: MediaStreamAudioSourceNode;
  hpFilter: BiquadFilterNode;
  mudFilter: BiquadFilterNode;
  presenceFilter: BiquadFilterNode;
  lpFilter: BiquadFilterNode;
  gateGain: GainNode;
  analyser: AnalyserNode;
  vocalComp: DynamicsCompressorNode;
  gainNode: GainNode;
  limiter: DynamicsCompressorNode;
}

export function buildVoiceAudioGraph(ctx: AudioContext, audioTrack: MediaStreamTrack, initialGain: number): VoiceAudioGraph {
  const srcNode = ctx.createMediaStreamSource(new MediaStream([audioTrack]));

  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.value = 125;
  hpFilter.Q.value = 0.707;

  const mudFilter = ctx.createBiquadFilter();
  mudFilter.type = 'peaking';
  mudFilter.frequency.value = 240;
  mudFilter.Q.value = 1.1;
  mudFilter.gain.value = -3.0;

  const presenceFilter = ctx.createBiquadFilter();
  presenceFilter.type = 'peaking';
  presenceFilter.frequency.value = 2300;
  presenceFilter.Q.value = 0.85;
  presenceFilter.gain.value = 2.0;

  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.value = 7000;
  lpFilter.Q.value = 0.707;

  const gateGain = ctx.createGain();
  gateGain.gain.value = 1.0;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.18;

  const vocalComp = ctx.createDynamicsCompressor();
  vocalComp.threshold.value = -18;
  vocalComp.knee.value = 12;
  vocalComp.ratio.value = 2.2;
  vocalComp.attack.value = 0.01;
  vocalComp.release.value = 0.15;

  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.max(0, Math.min(3.5, initialGain));

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5;
  limiter.knee.value = 2;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

  // Interconexión
  srcNode.connect(hpFilter).connect(mudFilter).connect(presenceFilter).connect(lpFilter);
  lpFilter.connect(analyser);
  lpFilter.connect(gateGain).connect(vocalComp).connect(gainNode).connect(limiter).connect(ctx.destination);

  return { srcNode, hpFilter, mudFilter, presenceFilter, lpFilter, gateGain, analyser, vocalComp, gainNode, limiter };
}
