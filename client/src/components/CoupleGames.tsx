import React from 'react';
import {
  IconCards,
  IconChevronRight,
  IconFire,
  IconGrid,
  IconHeart,
  IconHome,
  IconRefresh,
  IconSparkle,
  IconStar,
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
};

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
  const s: GamesState = {
    ...DEFAULT_GAMES_STATE,
    ...state,
    votes: state?.votes || {},
    board: Array.isArray(state?.board) && state.board.length === 9 ? state.board : Array(9).fill(null),
    scores: state?.scores || { left: 0, right: 0 },
  };

  const leftName = mySeat === 'left' ? myName : peerName || '1';
  const rightName = mySeat === 'right' ? myName : peerName || '2';
  const otherSeat: 'left' | 'right' = mySeat === 'left' ? 'right' : 'left';

  const myVote = s.votes[mySeat];
  const otherVote = s.votes[otherSeat];
  const bothVoted = Boolean(myVote && otherVote);

  const handleVote = (choice: 'left' | 'right') => {
    onUpdateState({
      ...s,
      votes: { ...s.votes, [mySeat]: choice },
    });
  };

  const handleNextLikely = () => {
    onUpdateState({
      ...s,
      likelyIdx: (s.likelyIdx + 1) % LIKELY_QUESTIONS.length,
      votes: {},
    });
  };

  const handleNextCard = (cat?: 'sweet' | 'deep' | 'spicy') => {
    const activeCat = cat || s.cardCategory;
    const deck = CARDS_DECK[activeCat];
    const nextIdx = cat ? 0 : (s.cardIdx + 1) % deck.length;
    onUpdateState({
      ...s,
      cardCategory: activeCat,
      cardIdx: nextIdx,
    });
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

  const question = LIKELY_QUESTIONS[s.likelyIdx % LIKELY_QUESTIONS.length];
  const deck = CARDS_DECK[s.cardCategory] || CARDS_DECK.sweet;
  const currentCard = deck[s.cardIdx % deck.length];

  return (
    <main className="cinema-stage games-stage">
      <div className="screen-bezel cute-activity-bezel kawaii-pastel-surface">
        {/* Barra Superior de Iconos (Sin Textos, Sin Emojis) */}
        <div className="kawaii-top-nav">
          <button type="button" className="kawaii-icon-circle" onClick={onBackToHub} aria-label="Home">
            <IconHome size={20} />
          </button>

          <div className="kawaii-pill-tabs">
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'likely' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'likely' })}
              aria-label="Votes"
            >
              <IconHeart size={20} />
            </button>
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'cards' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'cards' })}
              aria-label="Cards"
            >
              <IconCards size={20} />
            </button>
            <button
              type="button"
              className={`kawaii-tab-icon ${s.tab === 'ttt' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'ttt' })}
              aria-label="Tic Tac Toe"
            >
              <IconGrid size={20} />
            </button>
          </div>
        </div>

        {/* Contenido limpio */}
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
                  <IconHeart size={26} />
                  <strong>{leftName}</strong>
                </button>
                <button
                  type="button"
                  className={`kawaii-vote-card ${myVote === 'right' ? 'selected' : ''} ${
                    bothVoted && s.votes.left === 'right' && s.votes.right === 'right' ? 'matched' : ''
                  }`}
                  onClick={() => handleVote('right')}
                >
                  <IconStar size={26} />
                  <strong>{rightName}</strong>
                </button>
              </div>

              <button type="button" className="kawaii-action-circle" onClick={handleNextLikely}>
                <IconChevronRight size={24} />
              </button>
            </div>
          )}

          {s.tab === 'cards' && (
            <div className="kawaii-card-panel">
              <div className="kawaii-pill-tabs">
                <button
                  type="button"
                  className={`kawaii-tab-icon ${s.cardCategory === 'sweet' ? 'active' : ''}`}
                  onClick={() => handleNextCard('sweet')}
                >
                  <IconHeart size={18} />
                </button>
                <button
                  type="button"
                  className={`kawaii-tab-icon ${s.cardCategory === 'deep' ? 'active' : ''}`}
                  onClick={() => handleNextCard('deep')}
                >
                  <IconSparkle size={18} />
                </button>
                <button
                  type="button"
                  className={`kawaii-tab-icon ${s.cardCategory === 'spicy' ? 'active' : ''}`}
                  onClick={() => handleNextCard('spicy')}
                >
                  <IconFire size={18} />
                </button>
              </div>

              <div className="kawaii-reading-card">
                <p className="kawaii-question-text">{currentCard}</p>
              </div>

              <button type="button" className="kawaii-action-circle" onClick={() => handleNextCard()}>
                <IconChevronRight size={24} />
              </button>
            </div>
          )}

          {s.tab === 'ttt' && (
            <div className="kawaii-card-panel">
              <div className="kawaii-ttt-scores">
                <span className={`kawaii-score-badge ${s.turn === 'left' && !winner ? 'active' : ''}`}>
                  <IconHeart size={18} />
                  <strong>{s.scores.left}</strong>
                </span>
                <span className={`kawaii-score-badge ${s.turn === 'right' && !winner ? 'active' : ''}`}>
                  <IconStar size={18} />
                  <strong>{s.scores.right}</strong>
                </span>
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
                      <IconHeart size={30} />
                    ) : cell === 'right' ? (
                      <IconStar size={30} />
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
