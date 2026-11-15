import React, { useState } from 'react';
import { IconClose, IconPlus } from '../KawaiiIcons';
import { SLICE_COLORS } from './types';

interface Props {
  options: string[];
  onAddOption: (val: string) => void;
  onRemoveOption: (idx: number) => void;
}

export const WheelOptionsEditor: React.FC<Props> = ({ options, onAddOption, onRemoveOption }) => {
  const [newOption, setNewOption] = useState('');

  const handleAdd = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.length >= 12) return;
    setNewOption('');
    onAddOption(trimmed);
  };

  return (
    <div className="kawaii-wheel-options">
      <div className="kawaii-add-input-row">
        <input
          type="text"
          value={newOption}
          maxLength={24}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button type="button" className="kawaii-icon-circle small" onClick={handleAdd}>
          <IconPlus size={18} />
        </button>
      </div>

      <div className="kawaii-chips-wrap">
        {options.map((opt, i) => (
          <div key={i} className="kawaii-opt-chip" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}>
            <span>{opt}</span>
            {options.length > 2 && (
              <button type="button" onClick={() => onRemoveOption(i)}>
                <IconClose size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
