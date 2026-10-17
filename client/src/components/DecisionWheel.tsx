import React, { useState } from 'react';

export interface WheelState {
  title: string;
  options: string[];
  rotation: number;
  winner: string | null;
  spinningAt: number;
}

export const DEFAULT_WHEEL_STATE: WheelState = {
  title: '🍕 ¿Qué cenamos o pedimos hoy?',
  options: [
    'Pizza 🍕',
    'Hamburguesas 🍔',
    'Sushi 🍣',
    'Pastas 🍝',
    'Empanadas 🥟',
    'Milanesas 🍟',
  ],
  rotation: 0,
  winner: null,
  spinningAt: 0,
};

const PRESETS: { label: string; title: string; options: string[] }[] = [
  {
    label: '🍕 ¿Qué comemos?',
    title: '🍕 ¿Qué cenamos o pedimos hoy?',
    options: ['Pizza 🍕', 'Hamburguesas 🍔', 'Sushi 🍣', 'Pastas 🍝', 'Empanadas 🥟', 'Milanesas 🍟'],
  },
  {
    label: '🎬 ¿Qué género vemos?',
    title: '🎬 ¿Qué género de peli vemos hoy?',
    options: [
      'Romance Cute 💕',
      'Terror / Suspenso 👻',
      'Comedia 😂',
      'Ciencia Ficción 🚀',
      'Animación ✨',
      'Thriller / Misterio 🕵️',
    ],
  },
  {
    label: '🍨 ¿Postre o Dulce?',
    title: '🍨 ¿Con qué nos damos un gustito?',
    options: ['Helado 🍦', 'Chocolate 🍫', 'Frutillas con crema 🍓', 'Brownie con helado 🧁', 'Churros / Facturas 🥐'],
  },
  {
    label: '🎲 ¿Quién elige hoy?',
    title: '🎲 ¿A quién le toca elegir?',
    options: ['Elige Izquierda 👈💖', 'Elige Derecha 💖👉', 'Piedra Papel o Tijera ✊✋✌️', 'Vemos un tráiler al azar 🍿'],
  },
];

const SLICE_COLORS = [
  '#ff6b9d',
  '#a98bff',
  '#ffcf6b',
  '#63e6be',
  '#74c0fc',
  '#ff9770',
  '#f783ac',
  '#38d9a9',
];

interface Props {
  state: WheelState;
  onUpdateState: (next: WheelState) => void;
  onBackToHub: () => void;
}

export const DecisionWheel: React.FC<Props> = ({ state, onUpdateState, onBackToHub }) => {
  // Hooks al inicio
  const [newOption, setNewOption] = useState('');

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
    // El puntero está arriba (270 deg en coordenadas SVG o 0 deg desde el tope)
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

  const handleApplyPreset = (p: { title: string; options: string[] }) => {
    onUpdateState({
      ...s,
      title: p.title,
      options: p.options,
      winner: null,
    });
  };

  const count = s.options.length;
  const sliceAngle = 360 / count;

  return (
    <main className="cinema-stage wheel-stage">
      <div className="screen-bezel cute-activity-bezel">
        {/* Barra Superior */}
        <div className="activity-header-bar">
          <button type="button" className="studio-home-btn" onClick={onBackToHub}>
            🏠 Menú
          </button>
          <span className="studio-badge-title">🎡 Ruleta de Decisiones en Pareja</span>
          <div className="wheel-presets-row">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="wheel-preset-btn"
                onClick={() => handleApplyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cuerpo: Ruleta a la izquierda + Opciones a la derecha */}
        <div className="wheel-layout">
          <div className="wheel-visual-col">
            <h3 className="wheel-current-title">{s.title}</h3>
            <div className="wheel-spinner-box">
              <div className="wheel-pointer">▼</div>
              <svg
                viewBox="-110 -110 220 220"
                className="wheel-svg"
                style={{
                  transform: `rotate(${s.rotation}deg)`,
                  transition: 'transform 3.4s cubic-bezier(0.14, 0.85, 0.22, 1)',
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
                        stroke="#181122"
                        strokeWidth="2"
                      />
                      <text
                        x="56"
                        y="0"
                        fill="#181122"
                        fontSize="8.2"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${midDeg})`}
                      >
                        {opt.length > 16 ? `${opt.slice(0, 15)}…` : opt}
                      </text>
                    </g>
                  );
                })}
                <circle cx="0" cy="0" r="16" fill="#181122" stroke="#ffcf6b" strokeWidth="3" />
                <text x="0" y="1" fontSize="11" textAnchor="middle" dominantBaseline="middle">
                  💖
                </text>
              </svg>
            </div>

            <button type="button" className="cute-primary-btn spin-big-btn" onClick={handleSpin}>
              🎡 ¡Girar la Ruleta Juntos!
            </button>

            {s.winner && (
              <div className="wheel-winner-banner">
                <span>🎉 ¡La ruleta decidió!:</span>
                <strong>{s.winner}</strong>
              </div>
            )}
          </div>

          {/* Lista editable de opciones */}
          <div className="wheel-options-col">
            <h4>✨ Opciones en la ruleta ({s.options.length})</h4>
            <div className="wheel-add-row">
              <input
                type="text"
                placeholder="Agregar opción (ej: Helado 🍦)…"
                value={newOption}
                maxLength={28}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOption();
                }}
              />
              <button type="button" className="wheel-add-btn" onClick={handleAddOption}>
                + Sumar
              </button>
            </div>

            <div className="wheel-chips-list">
              {s.options.map((opt, i) => (
                <div key={i} className="wheel-option-item">
                  <span
                    className="wheel-opt-dot"
                    style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="wheel-opt-text">{opt}</span>
                  {s.options.length > 2 && (
                    <button
                      type="button"
                      className="wheel-opt-del"
                      onClick={() => handleRemoveOption(i)}
                      title="Quitar opción"
                    >
                      ✕
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
