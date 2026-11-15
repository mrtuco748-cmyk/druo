import React, { useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconClose, IconFire, IconHeart, IconPlus, IconSparkle } from '../KawaiiIcons';

interface Props {
  activeCat: 'sweet' | 'deep' | 'spicy';
  currentCard: string;
  onSelectCategory: (cat: 'sweet' | 'deep' | 'spicy') => void;
  onStep: (delta: number) => void;
  onAddCard: (text: string) => void;
}

export const CardsGameTab: React.FC<Props> = ({
  activeCat, currentCard, onSelectCategory, onStep, onAddCard,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAddCard(text.trim());
    setText('');
    setShowAdd(false);
  };

  return (
    <div className="kawaii-card-panel">
      <div className="kawaii-pill-tabs">
        <button type="button" className={`kawaii-tab-icon ${activeCat === 'sweet' ? 'active' : ''}`} onClick={() => onSelectCategory('sweet')}>
          <IconHeart size={18} />
        </button>
        <button type="button" className={`kawaii-tab-icon ${activeCat === 'deep' ? 'active' : ''}`} onClick={() => onSelectCategory('deep')}>
          <IconSparkle size={18} />
        </button>
        <button type="button" className={`kawaii-tab-icon ${activeCat === 'spicy' ? 'active' : ''}`} onClick={() => onSelectCategory('spicy')}>
          <IconFire size={18} />
        </button>
      </div>

      <div className="kawaii-reading-card">
        <p className="kawaii-question-text">{currentCard}</p>
      </div>

      {showAdd ? (
        <div className="kawaii-add-input-row full-width">
          <input
            type="text" value={text} maxLength={160} placeholder="Escribí tu propia carta o reto..."
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button type="button" className="kawaii-icon-circle small active" onClick={submit}><IconPlus size={16} /></button>
          <button type="button" className="kawaii-icon-circle small" onClick={() => setShowAdd(false)}><IconClose size={15} /></button>
        </div>
      ) : (
        <div className="kawaii-game-nav-row">
          <button type="button" className="kawaii-icon-circle" onClick={() => onStep(-1)}><IconChevronLeft size={20} /></button>
          <button type="button" className="kawaii-action-circle" onClick={() => onStep(1)}><IconChevronRight size={24} /></button>
          <button type="button" className="kawaii-icon-circle" onClick={() => setShowAdd(true)} aria-label="Add Card">
            <IconPlus size={19} />
          </button>
        </div>
      )}
    </div>
  );
};
