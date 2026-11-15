import React from 'react';
import { IconChevronLeft, IconChevronRight, IconHeart } from '../KawaiiIcons';

interface Props {
  myName: string;
  mySeat: 'left' | 'right';
  onChangeName: (name: string) => void;
  onChangeSeat: (seat: 'left' | 'right') => void;
  onEnter: () => void;
}

export const LobbyScreen: React.FC<Props> = ({
  myName, mySeat, onChangeName, onChangeSeat, onEnter,
}) => (
  <div className="lobby-curtain kawaii-lobby">
    <div className="lobby-card kawaii-lobby-card">
      <div className="kawaii-lobby-heart"><IconHeart size={36} /></div>
      <div className="lobby-logo">DRUO</div>

      <div className="lobby-fields">
        <label className="field-block">
          <input type="text" value={myName} onChange={(e) => onChangeName(e.target.value)} maxLength={24} placeholder="Nombre" />
        </label>

        <div className="seat-picker">
          <button type="button" className={`seat-btn ${mySeat === 'left' ? 'active' : ''}`} onClick={() => onChangeSeat('left')} aria-label="Left">
            <IconChevronLeft size={24} />
          </button>
          <button type="button" className={`seat-btn ${mySeat === 'right' ? 'active' : ''}`} onClick={() => onChangeSeat('right')} aria-label="Right">
            <IconChevronRight size={24} />
          </button>
        </div>
      </div>

      <button type="button" className="cta-enter kawaii-enter-btn" onClick={onEnter} aria-label="Enter">
        <IconHeart size={24} />
      </button>
    </div>
  </div>
);
