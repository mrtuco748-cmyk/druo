// Lógica pura de sincronización de reproducción entre la compu y el celular.

export interface PlaybackState {
  playing: boolean;
  position: number;
  rate: number;
  playlistIndex?: number;
  updatedAt: number;
  by?: string | null;
}

export function expectedPosition(state: PlaybackState, serverNow: number): number {
  if (!state.playing) return Math.max(0, state.position);
  const elapsed = Math.max(0, (serverNow - state.updatedAt) / 1000);
  return Math.max(0, state.position + elapsed * (state.rate || 1));
}

export type SyncDecision =
  | { action: 'none'; drift: number; target: number; rate: number }
  | { action: 'rate'; drift: number; target: number; rate: number }
  | { action: 'seek'; drift: number; target: number; rate: number };

/**
 * Decide cómo corregir el desfase entre el video local y el estado compartido:
 * - < 180 ms: no tocar nada (imperceptible)
 * - 180 ms a 1.6 s reproduciendo: acelerar/frenar suavemente (0.94x - 1.06x) sin corte
 * - > 1.6 s (o en pausa > 250 ms): saltar directo (seek)
 */
export function decideSync(localPos: number, state: PlaybackState, serverNow: number): SyncDecision {
  const target = expectedPosition(state, serverNow);
  const drift = target - localPos; // positivo = vamos atrasados
  const abs = Math.abs(drift);

  if (!state.playing) {
    if (abs > 0.25) return { action: 'seek', drift, target, rate: 1 };
    return { action: 'none', drift, target, rate: 1 };
  }

  if (abs < 0.18) return { action: 'none', drift, target, rate: 1 };
  if (abs > 1.6) return { action: 'seek', drift, target, rate: 1 };

  const nudge = Math.max(-0.06, Math.min(0.06, drift * 0.08));
  return { action: 'rate', drift, target, rate: Number((1 + nudge).toFixed(3)) };
}
