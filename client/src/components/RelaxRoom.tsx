import React, { useEffect, useState } from 'react';
import { IconHome, IconPause, IconPlay, IconVolume } from './KawaiiIcons';
import { AmbienceButtons } from './relax/AmbienceButtons';
import { AmbienceId, DEFAULT_RELAX_STATE, fmtTimer, RelaxState } from './relax/types';
import { useAmbienceAudio } from './relax/useAmbienceAudio';

export type { AmbienceId, RelaxState };
export { DEFAULT_RELAX_STATE };

interface Props {
  state: RelaxState;
  someoneSpeaking: boolean;
  onUpdateState: (next: RelaxState) => void;
  onBackToHub: () => void;
}

export const RelaxRoom: React.FC<Props> = ({ state, someoneSpeaking, onUpdateState, onBackToHub }) => {
  const [localVol, setLocalVol] = useState(0.35);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const s: RelaxState = { ...DEFAULT_RELAX_STATE, ...state };

  useAmbienceAudio(s.ambience, localVol, someoneSpeaking);

  useEffect(() => {
    if (!s.timerEndsAt) { setSecondsLeft(s.timerDurationSec || 1500); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((s.timerEndsAt! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [s.timerEndsAt, s.timerDurationSec]);

  const toggleTimer = () => {
    if (s.timerEndsAt) onUpdateState({ ...s, timerEndsAt: null });
    else {
      const dur = s.timerDurationSec || 1500;
      onUpdateState({ ...s, timerEndsAt: Date.now() + dur * 1000 });
    }
  };

  const setMins = (mins: number) => {
    const dur = mins * 60;
    onUpdateState({ ...s, timerDurationSec: dur, timerEndsAt: Date.now() + dur * 1000 });
  };

  return (
    <main className="cinema-stage relax-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        <div className="kawaii-top-nav">
          <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
            <IconHome size={20} />
          </button>
        </div>

        <div className="kawaii-relax-center">
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

          <AmbienceButtons ambience={s.ambience} onSelectAmbience={(ambience) => onUpdateState({ ...s, ambience })} />

          <div className="kawaii-icon-slider narrow">
            <IconVolume size={18} />
            <input type="range" min={0} max={1} step={0.05} value={localVol} onChange={(e) => setLocalVol(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </main>
  );
};
