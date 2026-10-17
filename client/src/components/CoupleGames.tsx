import React, { useState } from 'react';
import {
  IconCards,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconFire,
  IconGrid,
  IconHeart,
  IconHome,
  IconPlus,
  IconRefresh,
  IconSparkle,
} from './KawaiiIcons';

export interface GamesState {
  tab: 'likely' | 'cards' | 'ttt';
  likelyIdx: number;
  votes: { left?: 'left' | 'right'; right?: 'left' | 'right' };
  cardCategory: 'sweet' | 'deep' | 'spicy';
  cardIdx: number;
  board: ('left' | 'right' | null)[];
  turn: 'left' | 'right';
  scores: { left: number; right: number };
  leftEmoji?: string;
  rightEmoji?: string;
  customLikely?: string[];
  customCards?: Partial<Record<'sweet' | 'deep' | 'spicy', string[]>>;
}

export const DEFAULT_GAMES_STATE: GamesState = {
  tab: 'likely',
  likelyIdx: 0,
  votes: {},
  cardCategory: 'sweet',
  cardIdx: 0,
  board: Array(9).fill(null),
  turn: 'left',
  scores: { left: 0, right: 0 },
  leftEmoji: '🩷',
  rightEmoji: '💜',
  customLikely: [],
  customCards: {},
};

const EMOJI_PRESETS = [
  '🩷',
  '💜',
  '✨',
  '🌙',
  '🐱',
  '🐶',
  '🍓',
  '🍒',
  '🎀',
  '👑',
  '🔥',
  '🌸',
  '🦊',
  '🐰',
  '🦋',
  '🍕',
  '🎮',
  '👻',
];

const LIKELY_QUESTIONS = [
  '¿Quién es más probable que se quede dormido a los 15 minutos de empezar la película?',
  '¿Quién es más probable que robe comida del plato del otro diciendo "solo quiero probar"?',
  '¿Quién es más probable que pida mimos primero después de un día largo?',
  '¿Quién es más probable que tarde 40 minutos eligiendo qué ver y termine poniendo lo de siempre?',
  '¿Quién es más probable que se ría en un momento serio?',
  '¿Quién es más probable que mande 10 videos seguidos a las 2 de la mañana?',
  '¿Quién es más probable que se emocione con el final de una película tierna?',
  '¿Quién es más probable que se pierda incluso usando el mapa?',
  '¿Quién es más probable que adopte una mascota sin avisar?',
  '¿Quién es más probable que diga "5 minutitos más" cuando suena la alarma?',
  '¿Quién es más probable que planee una salida sorpresa de fin de semana?',
  '¿Quién es más probable que se coma el último pedazo de postre?',
];

const CARDS_DECK: Record<'sweet' | 'deep' | 'spicy', string[]> = {
  sweet: [
    '¿Cuál fue el primer pensamiento que tuviste la primera vez que hablamos o nos vimos?',
    '¿Qué pequeño gesto mío te hace sonreír automáticamente en el día a día?',
    'Si pudiéramos teletransportarnos ahora mismo a cualquier lugar juntos, ¿adónde iríamos?',
    '¿Cuál es tu recuerdo favorito de nosotros dos hasta ahora?',
    '¿Qué canción o película te hace acordar a mí siempre?',
    '¿Cómo describirías nuestra conexión en tres palabras?',
  ],
  deep: [
    '¿Qué es algo que aprendiste sobre vos mismo/a desde que estamos juntos?',
    '¿Cuál es un sueño o meta que te encantaría que cumplamos juntos en el futuro?',
    '¿En qué momento sentiste más paz estando conmigo?',
    '¿Qué valorás más de la forma en que nos cuidamos?',
    'Si pudieras congelar un momento nuestro para revivirlo siempre, ¿cuál elegirías?',
  ],
  spicy: [
    '¿Qué parte mía te vuelve más loco/a cuando nos vemos?',
    '¿Cuál sería tu cita nocturna ideal sin interrupciones?',
    '¿Qué fue lo más atrevido que pensaste la última vez que estuvimos juntos?',
    'Confesá algo que te den muchas ganas de hacer la próxima vez que nos veamos.',
    '¿Cuál es tu lugar o momento favorito para darnos besos?',
  ],
};

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: ('left' | 'right' | null)[]): 'left' | 'right' | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

interface Props {
  mySeat: 'left' | 'right';
  myName: string;
  peerName?: string;
  state: GamesState;
  onUpdateState: (next: GamesState) => void;
  onBackToHub: () => void;
}

export const CoupleGames: React.FC<Props> = ({
  mySeat,
  myName,
  peerName,
  state,
  onUpdateState,
  onBackToHub,
}) => {
  // Todos los hooks al inicio
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');

  const s: GamesState = {
    ...DEFAULT_GAMES_STATE,
    ...state,
    votes: state?.votes || {},
    board: Array.isArray(state?.board) && state.board.length === 9 ? state.board : Array(9).fill(null),
    scores: state?.scores || { left: 0, right: 0 },
    leftEmoji: state?.leftEmoji || '🩷',
    rightEmoji: state?.rightEmoji || '💜',
    customLikely: Array.isArray(state?.customLikely) ? state.customLikely : [],
    customCards: state?.customCards || {},
  };

  const leftName = mySeat === 'left' ? myName : peerName || '1';
  const rightName = mySeat === 'right' ? myName : peerName || '2';
  const otherSeat: 'left' | 'right' = mySeat === 'left' ? 'right' : 'left';

  const myVote = s.votes[mySeat];
  const otherVote = s.votes[otherSeat];
  const bothVoted = Boolean(myVote && otherVote);

  const allLikely = [...(s.customLikely || []), ...LIKELY_QUESTIONS];
  const activeCat = s.cardCategory || 'sweet';
  const allCards = [...(s.customCards?.[activeCat] || []), ...(CARDS_DECK[activeCat] || CARDS_DECK.sweet)];

  const handleSelectEmoji = (side: 'left' | 'right', em: string) => {
    const trimmed = em.trim();
    if (!trimmed) return;
    onUpdateState({
      ...s,
      leftEmoji: side === 'left' ? trimmed : s.leftEmoji,
      rightEmoji: side === 'right' ? trimmed : s.rightEmoji,
    });
    setCustomEmojiInput('');
    setEditingSide(null);
  };

  const handleVote = (choice: 'left' | 'right') => {
    onUpdateState({
      ...s,
      votes: { ...s.votes, [mySeat]: choice },
    });
  };

  const handleStepLikely = (delta: number) => {
    const len = allLikely.length;
    onUpdateState({
      ...s,
      likelyIdx: (s.likelyIdx + delta + len) % len,
      votes: {},
    });
  };

  const handleStepCard = (delta: number, cat?: 'sweet' | 'deep' | 'spicy') => {
    const nextCat = cat || activeCat;
    const deck = [...(s.customCards?.[nextCat] || []), ...(CARDS_DECK[nextCat] || CARDS_DECK.sweet)];
    const len = Math.max(1, deck.length);
    const nextIdx = cat ? 0 : (s.cardIdx + delta + len) % len;
    onUpdateState({
      ...s,
      cardCategory: nextCat,
      cardIdx: nextIdx,
    });
  };

  const handleAddCustomPrompt = () => {
    const text = newPromptText.trim();
    if (!text) return;
    setNewPromptText('');
    setShowAddPrompt(false);

    if (s.tab === 'likely') {
      const nextCustom = [text, ...(s.customLikely || [])];
      onUpdateState({
        ...s,
        customLikely: nextCustom,
        likelyIdx: 0,
        votes: {},
      });
    } else if (s.tab === 'cards') {
      const prevCatList = s.customCards?.[activeCat] || [];
      const nextCustomCards = {
        ...(s.customCards || {}),
        [activeCat]: [text, ...prevCatList],
      };
      onUpdateState({
        ...s,
        customCards: nextCustomCards,
        cardIdx: 0,
      });
    }
  };

  const winner = checkWinner(s.board);

  const handleCellClick = (idx: number) => {
    if (winner || s.board[idx] !== null || s.turn !== mySeat) return;
    const nextBoard = [...s.board];
    nextBoard[idx] = mySeat;
    const w = checkWinner(nextBoard);
    const nextScores = { ...s.scores };
    if (w === 'left') nextScores.left += 1;
    if (w === 'right') nextScores.right += 1;
    onUpdateState({
      ...s,
      board: nextBoard,
      turn: otherSeat,
      scores: nextScores,
    });
  };

  const handleResetTtt = () => {
    onUpdateState({
      ...s,
      board: Array(9).fill(null),
      turn: winner === 'left' ? 'right' : 'left',
    });
  };

  const question = allLikely[s.likelyIdx % allLikely.length];
  const currentCard = allCards[s.cardIdx % allCards.length];

  return (
    <main className="cinema-stage games-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        {/* Barra Superior de Iconos + Personalización de Emojis */}
        <div className="kawaii-top-nav">
          <div className="kawaii-nav-cluster">
            <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
              <IconHome size={20} />
            </button>

            {/* Botones rápidos para personalizar el emoji de cada jugador */}
            <div className="kawaii-emoji-Trigger-pill">
              <button
                type="button"
                className={`kawaii-emoji-avatar-btn ${editingSide === 'left' ? 'active' : ''}`}
                onClick={() => setEditingSide(editingSide === 'left' ? null : 'left')}
                title={leftName}
              >
                <span>{s.leftEmoji}</span>
              </button>
              <button
                type="button"
                className={`kawaii-emoji-avatar-btn ${editingSide === 'right' ? 'active' : ''}`}
                onClick={() => setEditingSide(editingSide === 'right' ? null : 'right')}
                title={rightName}
              >
                <span>{s.rightEmoji}</span>
              </button>
            </div>
          </div>

          <div className="kawaii-pill-tabs">
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'likely' ? 'active' : ''}`}
              onClick={() => {
                setShowAddPrompt(false);
                onUpdateState({ ...s, tab: 'likely' });
              }}
              aria-label="Votes"
            >
              <IconHeart size={21} />
            </button>
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'cards' ? 'active' : ''}`}
              onClick={() => {
                setShowAddPrompt(false);
                onUpdateState({ ...s, tab: 'cards' });
              }}
              aria-label="Cards Deck"
            >
              <IconCards size={24} />
            </button>
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'ttt' ? 'active' : ''}`}
              onClick={() => {
                setShowAddPrompt(false);
                onUpdateState({ ...s, tab: 'ttt' });
              }}
              aria-label="Tic Tac Toe"
            >
              <IconGrid size={21} />
            </button>
          </div>
        </div>

        {/* Popover para elegir o escribir cualquier Emoji personalizado */}
        {editingSide && (
          <div className="kawaii-emoji-picker-popover">
            <div className="kawaii-emoji-picker-head">
              <span className="kawaii-emoji-picker-badge">
                {editingSide === 'left' ? s.leftEmoji : s.rightEmoji} {editingSide === 'left' ? leftName : rightName}
              </span>
              <button
                type="button"
                className="kawaii-opt-close"
                onClick={() => setEditingSide(null)}
              >
                <IconClose size={14} />
              </button>
            </div>
            <div className="kawaii-emoji-grid">
              {EMOJI_PRESETS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`kawaii-emoji-cell ${
                    (editingSide === 'left' ? s.leftEmoji : s.rightEmoji) === em ? 'active' : ''
                  }`}
                  onClick={() => handleSelectEmoji(editingSide, em)}
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
                  if (e.key === 'Enter' && customEmojiInput.trim()) {
                    handleSelectEmoji(editingSide, customEmojiInput);
                  }
                }}
              />
              <button
                type="button"
                className="kawaii-icon-circle small"
                onClick={() => {
                  if (customEmojiInput.trim()) handleSelectEmoji(editingSide, customEmojiInput);
                }}
              >
                <IconPlus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Contenido central adaptable */}
        <div className="activity-content-center">
          {s.tab === 'likely' && (
            <div className="kawaii-card-panel">
              <h2 className="kawaii-question-text">{question}</h2>

              <div className="likely-buttons-row">
                <button
                  type="button"
                  className={`kawaii-vote-card ${myVote === 'left' ? 'selected' : ''} ${
                    bothVoted && s.votes.left === 'left' && s.votes.right === 'left' ? 'matched' : ''
                  }`}
                  onClick={() => handleVote('left')}
                >
                  <span className="kawaii-big-emoji">{s.leftEmoji}</span>
                  <strong>{leftName}</strong>
                </button>
                <button
                  type="button"
                  className={`kawaii-vote-card ${myVote === 'right' ? 'selected' : ''} ${
                    bothVoted && s.votes.left === 'right' && s.votes.right === 'right' ? 'matched' : ''
                  }`}
                  onClick={() => handleVote('right')}
                >
                  <span className="kawaii-big-emoji">{s.rightEmoji}</span>
                  <strong>{rightName}</strong>
                </button>
              </div>

              {showAddPrompt ? (
                <div className="kawaii-add-input-row full-width">
                  <input
                    type="text"
                    value={newPromptText}
                    maxLength={140}
                    placeholder="¿Quién es más probable que...?"
                    onChange={(e) => setNewPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomPrompt();
                    }}
                  />
                  <button type="button" className="kawaii-icon-circle small active" onClick={handleAddCustomPrompt}>
                    <IconPlus size={16} />
                  </button>
                  <button type="button" className="kawaii-icon-circle small" onClick={() => setShowAddPrompt(false)}>
                    <IconClose size={15} />
                  </button>
                </div>
              ) : (
                <div className="kawaii-game-nav-row">
                  <button type="button" className="kawaii-icon-circle" onClick={() => handleStepLikely(-1)}>
                    <IconChevronLeft size={20} />
                  </button>
                  <button type="button" className="kawaii-action-circle" onClick={() => handleStepLikely(1)}>
                    <IconChevronRight size={24} />
                  </button>
                  <button
                    type="button"
                    className="kawaii-icon-circle"
                    onClick={() => setShowAddPrompt(true)}
                    aria-label="Add Question"
                  >
                    <IconPlus size={19} />
                  </button>
                </div>
              )}
            </div>
          )}

          {s.tab === 'cards' && (
            <div className="kawaii-card-panel">
              <div className="kawaii-pill-tabs">
                <button
                  type="button"
                  className={`kawaii-tab-icon ${activeCat === 'sweet' ? 'active' : ''}`}
                  onClick={() => handleStepCard(0, 'sweet')}
                >
                  <IconHeart size={18} />
                </button>
                <button
                  type="button"
                  className={`kawaii-tab-icon ${activeCat === 'deep' ? 'active' : ''}`}
                  onClick={() => handleStepCard(0, 'deep')}
                >
                  <IconSparkle size={18} />
                </button>
                <button
                  type="button"
                  className={`kawaii-tab-icon ${activeCat === 'spicy' ? 'active' : ''}`}
                  onClick={() => handleStepCard(0, 'spicy')}
                >
                  <IconFire size={18} />
                </button>
              </div>

              <div className="kawaii-reading-card">
                <p className="kawaii-question-text">{currentCard}</p>
              </div>

              {showAddPrompt ? (
                <div className="kawaii-add-input-row full-width">
                  <input
                    type="text"
                    value={newPromptText}
                    maxLength={160}
                    placeholder="Escribí tu propia carta o reto..."
                    onChange={(e) => setNewPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomPrompt();
                    }}
                  />
                  <button type="button" className="kawaii-icon-circle small active" onClick={handleAddCustomPrompt}>
                    <IconPlus size={16} />
                  </button>
                  <button type="button" className="kawaii-icon-circle small" onClick={() => setShowAddPrompt(false)}>
                    <IconClose size={15} />
                  </button>
                </div>
              ) : (
                <div className="kawaii-game-nav-row">
                  <button type="button" className="kawaii-icon-circle" onClick={() => handleStepCard(-1)}>
                    <IconChevronLeft size={20} />
                  </button>
                  <button type="button" className="kawaii-action-circle" onClick={() => handleStepCard(1)}>
                    <IconChevronRight size={24} />
                  </button>
                  <button
                    type="button"
                    className="kawaii-icon-circle"
                    onClick={() => setShowAddPrompt(true)}
                    aria-label="Add Card"
                  >
                    <IconPlus size={19} />
                  </button>
                </div>
              )}
            </div>
          )}

          {s.tab === 'ttt' && (
            <div className="kawaii-card-panel kawaii-ttt-panel">
              <div className="kawaii-ttt-scores">
                <button
                  type="button"
                  className={`kawaii-score-badge ${s.turn === 'left' && !winner ? 'active' : ''}`}
                  onClick={() => setEditingSide(editingSide === 'left' ? null : 'left')}
                >
                  <span className="kawaii-badge-emoji">{s.leftEmoji}</span>
                  <strong>{s.scores.left}</strong>
                </button>
                <button
                  type="button"
                  className={`kawaii-score-badge ${s.turn === 'right' && !winner ? 'active' : ''}`}
                  onClick={() => setEditingSide(editingSide === 'right' ? null : 'right')}
                >
                  <span className="kawaii-badge-emoji">{s.rightEmoji}</span>
                  <strong>{s.scores.right}</strong>
                </button>
              </div>

              <div className="kawaii-ttt-grid">
                {s.board.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`kawaii-ttt-cell ${cell ? `is-${cell}` : ''}`}
                    onClick={() => handleCellClick(i)}
                  >
                    {cell === 'left' ? (
                      <span className="kawaii-cell-emoji">{s.leftEmoji}</span>
                    ) : cell === 'right' ? (
                      <span className="kawaii-cell-emoji">{s.rightEmoji}</span>
                    ) : null}
                  </button>
                ))}
              </div>

              <button type="button" className="kawaii-action-circle" onClick={handleResetTtt}>
                <IconRefresh size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
