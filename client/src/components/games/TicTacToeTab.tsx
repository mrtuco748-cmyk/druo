import React from 'react';
import { IconRefresh } from '../KawaiiIcons';

interface Props {
  board: ('left' | 'right' | null)[];
  turn: 'left' | 'right';
  winner: 'left' | 'right' | 'draw' | null;
  leftEmoji: string;
  rightEmoji: string;
  scores: { left: number; right: number };
  onCellClick: (idx: number) => void;
  onReset: () => void;
  onEditSide: (side: 'left' | 'right') => void;
}

export const TicTacToeTab: React.FC<Props> = ({
  board, turn, winner, leftEmoji, rightEmoji, scores,
  onCellClick, onReset, onEditSide,
}) => {
  return (
    <div className="kawaii-card-panel kawaii-ttt-panel">
      <div className="kawaii-ttt-scores">
        <button
          type="button"
          className={`kawaii-score-badge ${turn === 'left' && !winner ? 'active' : ''}`}
          onClick={() => onEditSide('left')}
        >
          <span className="kawaii-badge-emoji">{leftEmoji}</span>
          <strong>{scores.left}</strong>
        </button>
        <button
          type="button"
          className={`kawaii-score-badge ${turn === 'right' && !winner ? 'active' : ''}`}
          onClick={() => onEditSide('right')}
        >
          <span className="kawaii-badge-emoji">{rightEmoji}</span>
          <strong>{scores.right}</strong>
        </button>
      </div>

      <div className="kawaii-ttt-grid">
        {board.map((cell, i) => (
          <button key={i} type="button" className={`kawaii-ttt-cell ${cell ? `is-${cell}` : ''}`} onClick={() => onCellClick(i)}>
            {cell === 'left' ? (
              <span className="kawaii-cell-emoji">{leftEmoji}</span>
            ) : cell === 'right' ? (
              <span className="kawaii-cell-emoji">{rightEmoji}</span>
            ) : null}
          </button>
        ))}
      </div>

      <button type="button" className="kawaii-action-circle" onClick={onReset}>
        <IconRefresh size={20} />
      </button>
    </div>
  );
};
