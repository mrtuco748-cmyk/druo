import React from 'react';
import { IconHome, IconRefresh, IconSparkle } from './KawaiiIcons';
import { DEFAULT_WHEEL_STATE, WheelState } from './wheel/types';
import { PRESETS } from './wheel/wheelPresets';
import { WheelSvg } from './wheel/WheelSvg';
import { WheelOptionsEditor } from './wheel/WheelOptionsEditor';

export type { WheelState };
export { DEFAULT_WHEEL_STATE };

interface Props {
  state: WheelState;
  onUpdateState: (next: WheelState) => void;
  onBackToHub: () => void;
}

export const DecisionWheel: React.FC<Props> = ({ state, onUpdateState, onBackToHub }) => {
  const s: WheelState = {
    ...DEFAULT_WHEEL_STATE,
    ...state,
    options: Array.isArray(state?.options) && state.options.length >= 2 ? state.options : DEFAULT_WHEEL_STATE.options,
  };

  const handleSpin = () => {
    const count = s.options.length;
    if (count < 2) return;
    const winIdx = Math.floor(Math.random() * count);
    const sliceDeg = 360 / count;
    const sliceCenter = winIdx * sliceDeg + sliceDeg / 2;
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const baseMod = s.rotation % 360;
    const targetMod = (360 - sliceCenter) % 360;
    const delta = (targetMod - baseMod + 360) % 360;
    const nextRot = s.rotation + extraSpins + delta;

    onUpdateState({ ...s, rotation: nextRot, winner: s.options[winIdx], spinningAt: Date.now() });
  };

  const handleAdd = (val: string) => onUpdateState({ ...s, options: [...s.options, val], winner: null });
  const handleRemove = (idx: number) => onUpdateState({ ...s, options: s.options.filter((_, i) => i !== idx), winner: null });

  return (
    <main className="cinema-stage wheel-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        <div className="kawaii-top-nav">
          <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
            <IconHome size={20} />
          </button>
          <div className="kawaii-pill-tabs">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="kawaii-tab-icon"
                onClick={() => onUpdateState({ ...s, title: p.id, options: p.options, winner: null })}
              >
                {p.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="wheel-layout">
          <div className="wheel-visual-col">
            <WheelSvg options={s.options} rotation={s.rotation} />
            <div className="kawaii-wheel-controls">
              <button type="button" className="kawaii-action-circle big" onClick={handleSpin}>
                <IconRefresh size={24} />
              </button>
              {s.winner && (
                <div className="kawaii-winner-pill">
                  <IconSparkle size={16} />
                  <strong>{s.winner}</strong>
                </div>
              )}
            </div>
          </div>

          <WheelOptionsEditor options={s.options} onAddOption={handleAdd} onRemoveOption={handleRemove} />
        </div>
      </div>
    </main>
  );
};
