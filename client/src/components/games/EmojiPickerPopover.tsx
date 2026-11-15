import React, { useState } from 'react';
import { IconClose, IconPlus } from '../KawaiiIcons';
import { EMOJI_PRESETS } from './types';

interface Props {
  editingSide: 'left' | 'right';
  currentEmoji: string;
  playerName: string;
  onSelectEmoji: (side: 'left' | 'right', em: string) => void;
  onClose: () => void;
}

export const EmojiPickerPopover: React.FC<Props> = ({
  editingSide, currentEmoji, playerName, onSelectEmoji, onClose,
}) => {
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  const submit = (em: string) => {
    if (em.trim()) {
      onSelectEmoji(editingSide, em.trim());
      setCustomEmojiInput('');
    }
  };

  return (
    <div className="kawaii-emoji-picker-popover">
      <div className="kawaii-emoji-picker-head">
        <span className="kawaii-emoji-picker-badge">{currentEmoji} {playerName}</span>
        <button type="button" className="kawaii-opt-close" onClick={onClose}>
          <IconClose size={14} />
        </button>
      </div>
      <div className="kawaii-emoji-grid">
        {EMOJI_PRESETS.map((em) => (
          <button
            key={em}
            type="button"
            className={`kawaii-emoji-cell ${currentEmoji === em ? 'active' : ''}`}
            onClick={() => onSelectEmoji(editingSide, em)}
          >
            {em}
          </button>
        ))}
      </div>
      <div className="kawaii-add-input-row">
        <input
          type="text"
          value={customEmojiInput}
          maxLength={4}
          placeholder="✨"
          onChange={(e) => setCustomEmojiInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(customEmojiInput);
          }}
        />
        <button type="button" className="kawaii-icon-circle small" onClick={() => submit(customEmojiInput)}>
          <IconPlus size={16} />
        </button>
      </div>
    </div>
  );
};
