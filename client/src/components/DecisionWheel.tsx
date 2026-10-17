import React, { useState } from 'react';
import {
  IconCinema,
  IconClose,
  IconCoffee,
  IconGamepad,
  IconHeart,
  IconHome,
  IconPlus,
  IconRefresh,
  IconSparkle,
} from './KawaiiIcons';

export interface WheelState {
  title: string;
  options: string[];
  rotation: number;
  winner: string | null;
  spinningAt: number;
}

export const DEFAULT_WHEEL_STATE: WheelState = {
  title: 'Food',
  options: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Tacos', 'Helado'],
  rotation: 0,
  winner: null,
  spinningAt: 0,
};

const PRESETS: { id: string; icon: React.ReactNode; options: string[] }[] = [
  {
    id: 'food',
    icon: <IconCoffee size={18} />,
    options: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Empanadas', 'Helado'],
  },
  {
    id: 'movie',
    icon: <IconCinema size={18} />,
    options: ['Romance', 'Terror', 'Comedia', 'Sci-Fi', 'Anime', 'Misterio'],
  },
  {
    id: 'game',
    icon: <IconGamepad size={18} />,
    options: ['Dibujar', 'Peli', 'Preguntas', 'Tatetí', 'Charlar', 'Música'],
  },
  {
    id: 'turn',
    icon: <IconHeart size={18} />,
    options: ['Izquierda', 'Derecha', 'Izquierda', 'Derecha'],
  },
];

const SLICE_COLORS = [
  '#ffc2d4',
  '#ffe5a3',
  '#b8f2d8',
  '#bfe3ff',
  '#decaff',
  '#ffd4b8',
  '#f7c6ff',
  '#c4f5f0',
];

interface Props {
  state: WheelState;
  onUpdateState: (next: WheelState) => void;
  onBackToHub: () => void;
}

export const DecisionWheel: React.FC<Props> = ({ state, onUpdateState, onBackToHub }) => {
  const [newOption, setNewOption] = useState('');

  const s: WheelState = {
    ...DEFAULT_WHEEL_STATE,
    ...state,
    options:
      Array.isArray(state?.options) && state.options.length >= 2
        ? state.options
        : DEFAULT_WHEEL_STATE.options,
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

    onUpdateState({
      ...s,
      rotation: nextRot,
      winner: s.options[winIdx],
      spinningAt: Date.now(),
    });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || s.options.length >= 12) return;
    setNewOption('');
    onUpdateState({
      ...s,
      options: [...s.options, trimmed],
      winner: null,
    });
  };

  const handleRemoveOption = (idx: number) => {
    if (s.options.length <= 2) return;
    onUpdateState({
      ...s,
      options: s.options.filter((_, i) => i !== idx),
      winner: null,
    });
  };

  const count = s.options.length;
  const sliceAngle = 360 / count;

  return (
    <main className="cinema-stage wheel-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        {/* Barra Superior de Iconos */}
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
                onClick={() =>
                  onUpdateState({
                    ...s,
                    title: p.id,
                    options: p.options,
                    winner: null,
                  })
                }
              >
                {p.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="wheel-layout">
          <div className="wheel-visual-col">
            <div className="wheel-spinner-box">
              <div className="wheel-pointer">▼</div>
              <svg
                viewBox="-110 -110 220 220"
                className="wheel-svg"
                style={{
                  transform: `rotate(${s.rotation}deg)`,
                  transition: 'transform 3.2s cubic-bezier(0.14, 0.85, 0.22, 1)',
                }}
              >
                {s.options.map((opt, i) => {
                  const startDeg = i * sliceAngle - 90;
                  const endDeg = (i + 1) * sliceAngle - 90;
                  const startRad = (startDeg * Math.PI) / 180;
                  const endRad = (endDeg * Math.PI) / 180;
                  const r = 102;
                  const x1 = r * Math.cos(startRad);
                  const y1 = r * Math.sin(startRad);
                  const x2 = r * Math.cos(endRad);
                  const y2 = r * Math.sin(endRad);
                  const largeArc = sliceAngle > 180 ? 1 : 0;
                  const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  const midDeg = startDeg + sliceAngle / 2;

                  return (
                    <g key={i}>
                      <path
                        d={d}
                        fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />
                      <text
                        x="56"
                        y="0"
                        fill="#4a3b52"
                        fontSize="8.5"
                        fontWeight="800"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${midDeg})`}
                      >
                        {opt.length > 14 ? `${opt.slice(0, 13)}…` : opt}
                      </text>
                    </g>
                  );
                })}
                <circle cx="0" cy="0" r="18" fill="#fff0f6" stroke="#ff9ebb" strokeWidth="3" />
              </svg>
            </div>

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

          <div className="kawaii-wheel-options">
            <div className="kawaii-add-input-row">
              <input
                type="text"
                value={newOption}
                maxLength={24}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOption();
                }}
              />
              <button type="button" className="kawaii-icon-circle small" onClick={handleAddOption}>
                <IconPlus size={18} />
              </button>
            </div>

            <div className="kawaii-chips-wrap">
              {s.options.map((opt, i) => (
                <div
                  key={i}
                  className="kawaii-opt-chip"
                  style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                >
                  <span>{opt}</span>
                  {s.options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(i)}>
                      <IconClose size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
