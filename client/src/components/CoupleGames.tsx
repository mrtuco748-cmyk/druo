import React from 'react';
import { IconCards, IconGrid, IconHeart, IconHome } from './KawaiiIcons';
import { CardsGameTab } from './games/CardsGameTab';
import { EmojiPickerPopover } from './games/EmojiPickerPopover';
import { LikelyGameTab } from './games/LikelyGameTab';
import { TicTacToeTab } from './games/TicTacToeTab';
import { DEFAULT_GAMES_STATE, GamesState } from './games/types';
import { useCoupleGames } from './games/useCoupleGames';

export type { GamesState };
export { DEFAULT_GAMES_STATE };

interface Props {
  mySeat: 'left' | 'right';
  myName: string;
  peerName?: string;
  state: GamesState;
  onUpdateState: (next: GamesState) => void;
  onBackToHub: () => void;
}

export const CoupleGames: React.FC<Props> = ({ mySeat, myName, peerName, state, onUpdateState, onBackToHub }) => {
  const {
    s, editingSide, setEditingSide, leftName, rightName, myVote, bothVoted,
    allLikely, activeCat, allCards, winner,
    handleSelectEmoji, handleStepLikely, handleStepCard, handleAddPrompt, handleCellClick,
  } = useCoupleGames({ mySeat, myName, peerName, state, onUpdateState });

  return (
    <main className="cinema-stage games-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        <div className="kawaii-top-nav">
          <div className="kawaii-nav-cluster">
            <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home"><IconHome size={20} /></button>
            <div className="kawaii-emoji-Trigger-pill">
              <button type="button" className={`kawaii-emoji-avatar-btn ${editingSide === 'left' ? 'active' : ''}`} onClick={() => setEditingSide(editingSide === 'left' ? null : 'left')}>
                <span>{s.leftEmoji}</span>
              </button>
              <button type="button" className={`kawaii-emoji-avatar-btn ${editingSide === 'right' ? 'active' : ''}`} onClick={() => setEditingSide(editingSide === 'right' ? null : 'right')}>
                <span>{s.rightEmoji}</span>
              </button>
            </div>
          </div>
          <div className="kawaii-pill-tabs">
            <button type="button" className={`kawaii-tab-icon ${s.tab === 'likely' ? 'active' : ''}`} onClick={() => onUpdateState({ ...s, tab: 'likely' })}><IconHeart size={21} /></button>
            <button type="button" className={`kawaii-tab-icon ${s.tab === 'cards' ? 'active' : ''}`} onClick={() => onUpdateState({ ...s, tab: 'cards' })}><IconCards size={24} /></button>
            <button type="button" className={`kawaii-tab-icon ${s.tab === 'ttt' ? 'active' : ''}`} onClick={() => onUpdateState({ ...s, tab: 'ttt' })}><IconGrid size={21} /></button>
          </div>
        </div>

        {editingSide && (
          <EmojiPickerPopover
            editingSide={editingSide} currentEmoji={editingSide === 'left' ? s.leftEmoji! : s.rightEmoji!}
            playerName={editingSide === 'left' ? leftName : rightName} onSelectEmoji={handleSelectEmoji} onClose={() => setEditingSide(null)}
          />
        )}

        <div className="activity-content-center">
          {s.tab === 'likely' && (
            <LikelyGameTab
              question={allLikely[s.likelyIdx % allLikely.length]} leftEmoji={s.leftEmoji!} rightEmoji={s.rightEmoji!}
              leftName={leftName} rightName={rightName} myVote={myVote} bothVoted={bothVoted}
              leftVote={s.votes.left} rightVote={s.votes.right} onVote={(c) => onUpdateState({ ...s, votes: { ...s.votes, [mySeat]: c } })}
              onStep={handleStepLikely} onAddPrompt={handleAddPrompt}
            />
          )}
          {s.tab === 'cards' && (
            <CardsGameTab
              activeCat={activeCat} currentCard={allCards[s.cardIdx % allCards.length]}
              onSelectCategory={(cat) => handleStepCard(0, cat)} onStep={(d) => handleStepCard(d)} onAddCard={handleAddPrompt}
            />
          )}
          {s.tab === 'ttt' && (
            <TicTacToeTab
              board={s.board} turn={s.turn} winner={winner} leftEmoji={s.leftEmoji!} rightEmoji={s.rightEmoji!} scores={s.scores}
              onCellClick={handleCellClick} onReset={() => onUpdateState({ ...s, board: Array(9).fill(null), turn: winner === 'left' ? 'right' : 'left' })}
              onEditSide={(side) => setEditingSide(editingSide === side ? null : side)}
            />
          )}
        </div>
      </div>
    </main>
  );
};
