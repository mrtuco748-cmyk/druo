import React, { useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconClose, IconPlus } from '../KawaiiIcons';

interface Props {
  question: string;
  leftEmoji: string;
  rightEmoji: string;
  leftName: string;
  rightName: string;
  myVote?: 'left' | 'right';
  bothVoted: boolean;
  leftVote?: 'left' | 'right';
  rightVote?: 'left' | 'right';
  onVote: (choice: 'left' | 'right') => void;
  onStep: (delta: number) => void;
  onAddPrompt: (text: string) => void;
}

export const LikelyGameTab: React.FC<Props> = ({
  question, leftEmoji, rightEmoji, leftName, rightName,
  myVote, bothVoted, leftVote, rightVote,
  onVote, onStep, onAddPrompt,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAddPrompt(text.trim());
    setText('');
    setShowAdd(false);
  };

  return (
    <div className="kawaii-card-panel">
      <h2 className="kawaii-question-text">{question}</h2>

      <div className="likely-buttons-row">
        <button
          type="button"
          className={`kawaii-vote-card ${myVote === 'left' ? 'selected' : ''} ${bothVoted && leftVote === 'left' && rightVote === 'left' ? 'matched' : ''}`}
          onClick={() => onVote('left')}
        >
          <span className="kawaii-big-emoji">{leftEmoji}</span>
          <strong>{leftName}</strong>
        </button>
        <button
          type="button"
          className={`kawaii-vote-card ${myVote === 'right' ? 'selected' : ''} ${bothVoted && leftVote === 'right' && rightVote === 'right' ? 'matched' : ''}`}
          onClick={() => onVote('right')}
        >
          <span className="kawaii-big-emoji">{rightEmoji}</span>
          <strong>{rightName}</strong>
        </button>
      </div>

      {showAdd ? (
        <div className="kawaii-add-input-row full-width">
          <input
            type="text" value={text} maxLength={140} placeholder="¿Quién es más probable que...?"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button type="button" className="kawaii-icon-circle small active" onClick={submit}><IconPlus size={16} /></button>
          <button type="button" className="kawaii-icon-circle small" onClick={() => setShowAdd(false)}><IconClose size={15} /></button>
        </div>
      ) : (
        <div className="kawaii-game-nav-row">
          <button type="button" className="kawaii-icon-circle" onClick={() => onStep(-1)}><IconChevronLeft size={20} /></button>
          <button type="button" className="kawaii-action-circle" onClick={() => onStep(1)}><IconChevronRight size={24} /></button>
          <button type="button" className="kawaii-icon-circle" onClick={() => setShowAdd(true)} aria-label="Add Question">
            <IconPlus size={19} />
          </button>
        </div>
      )}
    </div>
  );
};
