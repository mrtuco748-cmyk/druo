import React from 'react';

interface Props {
  viewMode: 'cinema' | 'call-only' | 'focus-movie' | 'duo';
  onSelectViewMode: (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => void;
}

const VIEW_MODES = [
  { id: 'cinema', label: '🎬 Modo Cine', hint: 'Película al centro, cámaras a los lados' },
  { id: 'call-only', label: '💬 Solo Videollamada', hint: 'Cámaras gigantes cara a cara' },
  { id: 'focus-movie', label: '⛶ Enfoque Película', hint: 'Película completa, cámaras flotantes' },
  { id: 'duo', label: '📱 Modo Dúo', hint: 'Cámaras ampliadas para ver reacciones' },
] as const;

export const ViewModeSection: React.FC<Props> = ({ viewMode, onSelectViewMode }) => {
  return (
    <section className="q-section">
      <h4>👁️ Modo de vista de la pantalla</h4>
      <div className="chip-grid">
        {VIEW_MODES.map((m) => (
          <button key={m.id} type="button" className={`q-chip ${viewMode === m.id ? 'active' : ''}`} onClick={() => onSelectViewMode(m.id)}>
            <strong>{m.label}</strong>
            <small>{m.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
};
