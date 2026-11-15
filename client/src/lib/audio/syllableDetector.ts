// Detector en tiempo real de sílabas humanas para ducking y control de voz
import { getSharedAudioContext } from './audioContext';
import { avgFreqRange, computeRmsAndZcr, findPeakRange } from './bufferAnalysis';
import { isHumanSyllableFrame } from './syllableMetrics';

export interface SyllableDetectorOptions {
  stream: MediaStream;
  isMicEnabled: () => boolean;
  onSpeakingChange: (speaking: boolean) => void;
}

export function createSyllableVoiceDetector(opts: SyllableDetectorOptions): () => void {
  const { stream, isMicEnabled, onSpeakingChange } = opts;
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) { onSpeakingChange(false); return () => {}; }
  const ctx = getSharedAudioContext();
  if (!ctx) return () => {};

  let src: MediaStreamAudioSourceNode | null = null, hpFilter: BiquadFilterNode | null = null;
  let analyser: AnalyserNode | null = null, silentGain: GainNode | null = null, timer: any = null;

  try {
    src = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
    hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass'; hpFilter.frequency.value = 100; hpFilter.Q.value = 0.707;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.22;

    silentGain = ctx.createGain(); silentGain.gain.value = 0;
    src.connect(hpFilter).connect(analyser).connect(silentGain).connect(ctx.destination);

    const freqBuf = new Uint8Array(analyser.frequencyBinCount);
    const timeBuf = new Uint8Array(analyser.fftSize);
    const binHz = (ctx.sampleRate || 48000) / analyser.fftSize;
    const binIdx = (hz: number) => Math.max(0, Math.min(freqBuf.length - 1, Math.round(hz / binHz)));

    const bSub = [0, Math.max(1, binIdx(95))], bF0 = [bSub[1], Math.max(bSub[1] + 1, binIdx(360))];
    const bF1F2 = [bF0[1], Math.max(bF0[1] + 1, binIdx(2800))], bPres = [bF1F2[1], Math.max(bF1F2[1] + 1, binIdx(4200))];
    const bNoise = [Math.max(bPres[1], binIdx(4500)), Math.max(binIdx(4500) + 1, binIdx(10000))];

    let noiseFloor = 10, syllableScore = 0, holdFrames = 0, isSpeaking = false;

    timer = setInterval(() => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!isMicEnabled() || !audioTracks[0].enabled) {
        syllableScore = 0; holdFrames = 0;
        if (isSpeaking) { isSpeaking = false; onSpeakingChange(false); }
        return;
      }

      analyser!.getByteFrequencyData(freqBuf);
      analyser!.getByteTimeDomainData(timeBuf);

      const subBassAvg = avgFreqRange(freqBuf, bSub[0], bSub[1]), f0Avg = avgFreqRange(freqBuf, bF0[0], bF0[1]);
      const f1f2Avg = avgFreqRange(freqBuf, bF1F2[0], bF1F2[1]), presenceAvg = avgFreqRange(freqBuf, bPres[0], bPres[1]);
      const highNoiseAvg = avgFreqRange(freqBuf, bNoise[0], bNoise[1]), vocalPeak = findPeakRange(freqBuf, bF0[0], bF1F2[1]);
      const { rms, zcr } = computeRmsAndZcr(timeBuf);

      const vocalAvg = f0Avg * 0.42 + f1f2Avg * 0.58;
      if (!isSpeaking && syllableScore === 0) {
        if (vocalAvg < noiseFloor) noiseFloor = noiseFloor * 0.85 + vocalAvg * 0.15;
        else if (vocalAvg < noiseFloor + 12) noiseFloor = noiseFloor * 0.98 + vocalAvg * 0.02;
        noiseFloor = Math.max(6, Math.min(38, noiseFloor));
      }

      const valid = isHumanSyllableFrame({
        subBassAvg, f0Avg, f1f2Avg, presenceAvg, highNoiseAvg, vocalPeak, rms, zcr, noiseFloor, currentlySpeaking: isSpeaking,
      });

      if (valid) {
        syllableScore = Math.min(6, syllableScore + 1);
        if (syllableScore >= 3) holdFrames = 22;
      } else {
        syllableScore = Math.max(0, syllableScore - 1);
        if (holdFrames > 0) holdFrames -= 1;
      }

      const nextSpeaking = holdFrames > 0;
      if (nextSpeaking !== isSpeaking) {
        isSpeaking = nextSpeaking;
        onSpeakingChange(nextSpeaking);
      }
    }, 35);
  } catch (e) {
    console.warn('[voiceEngine] Error en detector de sílabas:', e);
  }

  return () => {
    clearInterval(timer);
    try {
      src?.disconnect(); hpFilter?.disconnect(); analyser?.disconnect(); silentGain?.disconnect();
    } catch {}
  };
}
