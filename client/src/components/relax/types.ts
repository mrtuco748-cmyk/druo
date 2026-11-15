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

export const fmtTimer = (sec: number) => {
  const m = Math.floor(sec / 60);
  const r = String(sec % 60).padStart(2, '0');
  return `${String(m).padStart(2, '0')}:${r}`;
};
