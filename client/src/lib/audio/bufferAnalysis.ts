// Cálculo de promedios de frecuencia y dominio del tiempo para detección de voz
export function computeRmsAndZcr(timeBuf: Uint8Array): { rms: number; zcr: number } {
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
  return {
    rms: Math.sqrt(sumSq / timeBuf.length),
    zcr: zeroCrossings / timeBuf.length,
  };
}

export function avgFreqRange(freqBuf: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const count = Math.max(1, end - start);
  for (let i = start; i < end; i++) sum += freqBuf[i];
  return sum / count;
}

export function findPeakRange(freqBuf: Uint8Array, start: number, end: number): number {
  let peak = 0;
  for (let i = start; i < end; i++) {
    if (freqBuf[i] > peak) peak = freqBuf[i];
  }
  return peak;
}
