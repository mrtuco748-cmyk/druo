// Métricas y evaluación formántica de sílabas humanas
export interface SyllableFrameMetrics {
  subBassAvg: number;     // 20 - 95 Hz
  f0Avg: number;          // 95 - 360 Hz (tono fundamental)
  f1f2Avg: number;        // 360 - 2800 Hz (formantes vocálicos)
  presenceAvg: number;    // 2800 - 4200 Hz (consonantes)
  highNoiseAvg: number;   // 4500 - 10000 Hz (siseos, clics)
  vocalPeak: number;      // Pico máximo 95 - 2800 Hz
  rms: number;            // Energía RMS en el tiempo
  zcr: number;            // Tasa de cruces por cero
  noiseFloor: number;     // Piso de ruido adaptativo
  currentlySpeaking: boolean;
}

export function isHumanSyllableFrame(m: SyllableFrameMetrics): boolean {
  const vocalAvg = m.f0Avg * 0.42 + m.f1f2Avg * 0.58;

  const minRms = m.currentlySpeaking ? 3.6 : 5.0;
  const minVocalAboveFloor = m.currentlySpeaking ? 11 : 16;
  const minVocalAbs = m.currentlySpeaking ? 20 : 27;

  if (m.rms < minRms) return false;
  if (vocalAvg < minVocalAbs) return false;
  if (vocalAvg < m.noiseFloor + minVocalAboveFloor) return false;

  const minF0 = m.currentlySpeaking ? 18 : 24;
  const minF1F2 = m.currentlySpeaking ? 15 : 21;
  if (m.f0Avg < minF0 || m.f1f2Avg < minF1F2) return false;

  const crestRatio = vocalAvg > 0 ? m.vocalPeak / vocalAvg : 0;
  const minCrest = m.currentlySpeaking ? 1.28 : 1.38;
  if (crestRatio < minCrest || m.vocalPeak < (m.currentlySpeaking ? 34 : 44)) return false;

  // Rechazo de graves y explosiones
  if (m.subBassAvg > vocalAvg * 1.15 && m.f1f2Avg < m.subBassAvg * 0.75) return false;
  // Rechazo de ruido agudo
  if (m.highNoiseAvg > vocalAvg * 0.62) return false;
  // Rechazo de chasquidos
  if (m.zcr > 0.42) return false;

  return true;
}
