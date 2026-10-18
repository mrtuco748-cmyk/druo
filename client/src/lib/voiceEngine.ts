// Motor de audio profesional para Druo:
// 1. AudioContext único compartido (evita conflictos de hilos de audio y protege el AEC del navegador)
// 2. Detector inteligente de Voz Humana y Sílabas (Formantes F0 + F1/F2 + prominencia armónica + compuerta temporal de sílaba)
//    Ignora clics, golpes al micrófono, roces, respiraciones y ruido de fondo de la película.
// 3. Cadena de Claridad Vocal Broadcast para el audio remoto (Filtro pasa-altos 110Hz + corte de barro 230Hz +
//    realce de presencia vocal 2.5kHz + compresor suave + amplificador hasta 400% + limitador de protección).

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AC({ latencyHint: 'interactive' });
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function resumeSharedAudioContext(): void {
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

/**
 * Evalúa si un espectro de frecuencias + forma de onda corresponde a una sílaba / letra hablada por una voz humana.
 * Exportado como función pura también para pruebas unitarias.
 */
export interface SyllableFrameMetrics {
  subBassAvg: number;     // 20 - 95 Hz (golpes de mesa, explosiones de peli, pasos)
  f0Avg: number;          // 95 - 360 Hz (tono fundamental de cuerdas vocales humanas)
  f1f2Avg: number;        // 360 - 2800 Hz (formantes vocálicos y sílabas: a, e, i, o, u, consonantes sonoras)
  presenceAvg: number;    // 2800 - 4200 Hz (articulación de letras y consonantes)
  highNoiseAvg: number;   // 4500 - 10000 Hz (clics, golpes de platos, teclado, soplidos, siseo)
  vocalPeak: number;      // Pico máximo dentro de la banda vocal (95 - 2800 Hz)
  rms: number;            // Energía RMS en dominio del tiempo (post filtro pasa-altos)
  zcr: number;            // Tasa de cruces por cero normalizada (0..1)
  noiseFloor: number;     // Piso de ruido adaptativo actual
  currentlySpeaking: boolean;
}

export function isHumanSyllableFrame(m: SyllableFrameMetrics): boolean {
  const vocalAvg = m.f0Avg * 0.42 + m.f1f2Avg * 0.58;

  // Histeresis: una vez que ya está hablando, permitimos continuar la frase con un umbral ligeramente menor
  const minRms = m.currentlySpeaking ? 3.6 : 5.0;
  const minVocalAboveFloor = m.currentlySpeaking ? 11 : 16;
  const minVocalAbs = m.currentlySpeaking ? 20 : 27;

  // 1. Nivel mínimo por encima del silencio y del piso de ruido ambiente
  if (m.rms < minRms) return false;
  if (vocalAvg < minVocalAbs) return false;
  if (vocalAvg < m.noiseFloor + minVocalAboveFloor) return false;

  // 2. Presencia simultánea de cuerdas vocales (F0) y resonancia de boca/sílaba (F1/F2)
  const minF0 = m.currentlySpeaking ? 18 : 24;
  const minF1F2 = m.currentlySpeaking ? 15 : 21;
  if (m.f0Avg < minF0 || m.f1f2Avg < minF1F2) return false;

  // 3. Prominencia armónica (formantes): la voz hablada concentra energía en picos armónicos,
  //    mientras que un soplido o roce contra el micrófono es ruido plano de banda ancha.
  const crestRatio = vocalAvg > 0 ? m.vocalPeak / vocalAvg : 0;
  const minCrest = m.currentlySpeaking ? 1.28 : 1.38;
  if (crestRatio < minCrest || m.vocalPeak < (m.currentlySpeaking ? 34 : 44)) return false;

  // 4. Rechazo de golpes graves (sub-bass < 95 Hz) y explosiones de la película
  if (m.subBassAvg > vocalAvg * 1.15 && m.f1f2Avg < m.subBassAvg * 0.75) {
    return false;
  }

  // 5. Rechazo de clics, teclado, golpecitos y siseos agudos (> 4500 Hz)
  if (m.highNoiseAvg > vocalAvg * 0.62) {
    return false;
  }

  // 6. Tasa de cruces por cero (ZCR) coherente con voz humana (descarta chasquidos secos o ruido blanco puro)
  if (m.zcr > 0.42) {
    return false;
  }

  return true;
}

export interface SyllableDetectorOptions {
  stream: MediaStream;
  isMicEnabled: () => boolean;
  onSpeakingChange: (speaking: boolean) => void;
}

/**
 * Crea un detector en tiempo real que analiza cada 35ms la estructura formántica de la voz
 * y exige al menos ~105ms (3 frames) de sílaba humana real antes de activar el ducking.
 */
export function createSyllableVoiceDetector(opts: SyllableDetectorOptions): () => void {
  const { stream, isMicEnabled, onSpeakingChange } = opts;
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    onSpeakingChange(false);
    return () => {};
  }

  const ctx = getSharedAudioContext();
  if (!ctx) return () => {};

  let src: MediaStreamAudioSourceNode | null = null;
  let hpFilter: BiquadFilterNode | null = null;
  let analyser: AnalyserNode | null = null;
  let silentGain: GainNode | null = null;
  let timer: any = null;

  try {
    src = ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));

    // Filtro pasa-altos a 100 Hz antes del analizador para limpiar golpes de mesa/micrófono y bajos de la película
    hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 100;
    hpFilter.Q.value = 0.707;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.22;

    // En Chromium un MediaStreamSource conectado a un Analyser necesita ruta a destination (con ganancia 0)
    silentGain = ctx.createGain();
    silentGain.gain.value = 0;

    src.connect(hpFilter);
    hpFilter.connect(analyser);
    analyser.connect(silentGain);
    silentGain.connect(ctx.destination);

    const freqBuf = new Uint8Array(analyser.frequencyBinCount);
    const timeBuf = new Uint8Array(analyser.fftSize);
    const sampleRate = ctx.sampleRate || 48000;
    const binHz = sampleRate / analyser.fftSize; // ~46.875 Hz por bin a 48kHz

    const binIdx = (hz: number) =>
      Math.max(0, Math.min(freqBuf.length - 1, Math.round(hz / binHz)));

    const bSubStart = 0;
    const bSubEnd = Math.max(1, binIdx(95));
    const bF0Start = bSubEnd;
    const bF0End = Math.max(bF0Start + 1, binIdx(360));
    const bFormantStart = bF0End;
    const bFormantEnd = Math.max(bFormantStart + 1, binIdx(2800));
    const bPresStart = bFormantEnd;
    const bPresEnd = Math.max(bPresStart + 1, binIdx(4200));
    const bNoiseStart = Math.max(bPresEnd, binIdx(4500));
    const bNoiseEnd = Math.max(bNoiseStart + 1, binIdx(10000));

    let noiseFloor = 10;
    let syllableScore = 0; // Requiere 3 frames (~105 ms) de formante vocal para disparar
    let holdFrames = 0;    // Mantiene ~770 ms (22 * 35ms) entre sílabas/palabras de una oración
    let isSpeaking = false;

    const avgRange = (start: number, end: number): number => {
      let sum = 0;
      const count = Math.max(1, end - start);
      for (let i = start; i < end; i++) sum += freqBuf[i];
      return sum / count;
    };

    timer = setInterval(() => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (!isMicEnabled() || !audioTracks[0].enabled) {
        syllableScore = 0;
        holdFrames = 0;
        if (isSpeaking) {
          isSpeaking = false;
          onSpeakingChange(false);
        }
        return;
      }

      analyser!.getByteFrequencyData(freqBuf);
      analyser!.getByteTimeDomainData(timeBuf);

      const subBassAvg = avgRange(bSubStart, bSubEnd);
      const f0Avg = avgRange(bF0Start, bF0End);
      const f1f2Avg = avgRange(bFormantStart, bFormantEnd);
      const presenceAvg = avgRange(bPresStart, bPresEnd);
      const highNoiseAvg = avgRange(bNoiseStart, bNoiseEnd);

      let vocalPeak = 0;
      for (let i = bF0Start; i < bFormantEnd; i++) {
        if (freqBuf[i] > vocalPeak) vocalPeak = freqBuf[i];
      }

      let sumSq = 0;
      let zeroCrossings = 0;
      let prevSign = timeBuf[0] >= 128 ? 1 : -1;
      for (let i = 0; i < timeBuf.length; i++) {
        const centered = timeBuf[i] - 128;
        sumSq += centered * centered;
        const sign = centered >= 0 ? 1 : -1;
        if (sign !== prevSign && Math.abs(centered) > 2) {
          zeroCrossings++;
          prevSign = sign;
        }
      }
      const rms = Math.sqrt(sumSq / timeBuf.length);
      const zcr = zeroCrossings / timeBuf.length;

      const vocalAvg = f0Avg * 0.42 + f1f2Avg * 0.58;

      // Actualizar piso de ruido ambiente solo cuando no se está hablando
      if (!isSpeaking && syllableScore === 0) {
        if (vocalAvg < noiseFloor) {
          noiseFloor = noiseFloor * 0.85 + vocalAvg * 0.15;
        } else if (vocalAvg < noiseFloor + 12) {
          noiseFloor = noiseFloor * 0.98 + vocalAvg * 0.02;
        }
        noiseFloor = Math.max(6, Math.min(38, noiseFloor));
      }

      const validSyllableFrame = isHumanSyllableFrame({
        subBassAvg,
        f0Avg,
        f1f2Avg,
        presenceAvg,
        highNoiseAvg,
        vocalPeak,
        rms,
        zcr,
        noiseFloor,
        currentlySpeaking: isSpeaking,
      });

      if (validSyllableFrame) {
        syllableScore = Math.min(6, syllableScore + 1);
        if (syllableScore >= 3) {
          // Sílaba o letra confirmada (>= ~105ms de formantes humanos)
          holdFrames = 22; // ~770ms de sostén suave para unir palabras al hablar
        }
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
    console.warn('[voiceEngine] Error iniciando detector de sílabas:', e);
  }

  return () => {
    clearInterval(timer);
    try {
      src?.disconnect();
      hpFilter?.disconnect();
      analyser?.disconnect();
      silentGain?.disconnect();
    } catch {}
  };
}

export interface RemoteVoiceChain {
  setGain: (gainValue: number) => void;
  destroy: () => void;
}

/**
 * Cadena de Claridad Vocal Broadcast para la voz de la otra persona:
 * - Limpia el grave/retumbe de la película filtrada por su micrófono (High-Pass 110Hz + Anti-mud 230Hz)
 * - Realza la nitidez de las sílabas y consonantes (+4.5dB en 2.5kHz)
 * - Suaviza picos con compresor vocal antes de amplificar hasta 400%
 * - Protege contra saturación/distorsión con un limitador final
 */
export function createRemoteVoiceProcessor(
  audioTrack: MediaStreamTrack,
  initialGain: number
): RemoteVoiceChain | null {
  const ctx = getSharedAudioContext();
  if (!ctx) return null;

  try {
    const srcNode = ctx.createMediaStreamSource(new MediaStream([audioTrack]));

    // 1. Filtro Pasa-Altos (125 Hz): elimina retumbe grave, vibración del celular y bajos de la película
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 125;
    hpFilter.Q.value = 0.707;

    // 2. Filtro Anti-Barro (240 Hz, -3.0 dB): quita el sonido encajonado
    const mudFilter = ctx.createBiquadFilter();
    mudFilter.type = 'peaking';
    mudFilter.frequency.value = 240;
    mudFilter.Q.value = 1.1;
    mudFilter.gain.value = -3.0;

    // 3. Realce moderado de Presencia y Dicción Vocal (2300 Hz, +2.0 dB): claridad sin acentuar siseo
    const presenceFilter = ctx.createBiquadFilter();
    presenceFilter.type = 'peaking';
    presenceFilter.frequency.value = 2300;
    presenceFilter.Q.value = 0.85;
    presenceFilter.gain.value = 2.0;

    // 4. Filtro Pasa-Bajos (7000 Hz): corta siseo térmico, estática y ruido blanco de micrófonos de celular
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 7000;
    lpFilter.Q.value = 0.707;

    // 5. Compuerta de Ruido Inteligente (Noise Gate): silencia completamente el ruido de fondo cuando ella está callada
    const gateGain = ctx.createGain();
    gateGain.gain.value = 1.0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.18;
    const timeBuf = new Uint8Array(analyser.fftSize);

    // 6. Nivelador suave de volumen vocal
    const vocalComp = ctx.createDynamicsCompressor();
    vocalComp.threshold.value = -18;
    vocalComp.knee.value = 12;
    vocalComp.ratio.value = 2.2;
    vocalComp.attack.value = 0.01;
    vocalComp.release.value = 0.15;

    // 7. Ganancia de Usuario (0% a 350%)
    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.max(0, Math.min(3.5, initialGain));

    // 8. Limitador de Protección Final
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    // Conexión del grafo de audio
    srcNode.connect(hpFilter);
    hpFilter.connect(mudFilter);
    mudFilter.connect(presenceFilter);
    presenceFilter.connect(lpFilter);

    // Analizador post-filtros para evaluar si hay voz real o solo ruido de fondo
    lpFilter.connect(analyser);

    // Cadena principal: lpFilter -> gateGain -> vocalComp -> gainNode -> limiter -> destination
    lpFilter.connect(gateGain);
    gateGain.connect(vocalComp);
    vocalComp.connect(gainNode);
    gainNode.connect(limiter);
    limiter.connect(ctx.destination);

    let gateOpen = true;
    let holdCounter = 0; // Sostiene ~420ms entre palabras de una misma frase
    let noiseFloor = 3.5;

    const gateTimer = setInterval(() => {
      if (ctx.state !== 'running' || !audioTrack.enabled) return;

      analyser.getByteTimeDomainData(timeBuf);
      let sumSq = 0;
      for (let i = 0; i < timeBuf.length; i++) {
        const sample = (timeBuf[i] - 128) / 128;
        sumSq += sample * sample;
      }
      const rms = Math.sqrt(sumSq / timeBuf.length) * 100;

      // Umbral adaptativo: por encima del piso de ruido ambiente
      const voiceThreshold = Math.max(2.6, noiseFloor * 1.55);

      if (rms > voiceThreshold) {
        holdCounter = 14; // ~420ms (14 * 30ms)
        if (!gateOpen) {
          gateOpen = true;
          try {
            gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.015);
          } catch {
            gateGain.gain.value = 1.0;
          }
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
          try {
            // Atenuación suave y transparente (-46 dB) que elimina el 100% del ruido blanco
            gateGain.gain.setTargetAtTime(0.005, ctx.currentTime, 0.035);
          } catch {
            gateGain.gain.value = 0.005;
          }
        }
      }
    }, 30);

    return {
      setGain: (val: number) => {
        const clamped = Math.max(0, Math.min(3.5, val));
        try {
          gainNode.gain.setTargetAtTime(clamped, ctx.currentTime, 0.015);
        } catch {
          gainNode.gain.value = clamped;
        }
      },
      destroy: () => {
        clearInterval(gateTimer);
        try {
          srcNode.disconnect();
          hpFilter.disconnect();
          mudFilter.disconnect();
          presenceFilter.disconnect();
          lpFilter.disconnect();
          analyser.disconnect();
          gateGain.disconnect();
          vocalComp.disconnect();
          gainNode.disconnect();
          limiter.disconnect();
        } catch {}
      },
    };
  } catch (e) {
    console.warn('[voiceEngine] Error creando cadena vocal remota:', e);
    return null;
  }
}
