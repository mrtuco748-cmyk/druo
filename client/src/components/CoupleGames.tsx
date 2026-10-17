import React from 'react';

export interface GamesState {
  tab: 'likely' | 'cards' | 'ttt';
  // ¿Quién es más probable?
  likelyIdx: number;
  votes: { left?: 'left' | 'right'; right?: 'left' | 'right' };
  // Cartas de conexión
  cardCategory: 'sweet' | 'deep' | 'spicy';
  cardIdx: number;
  // Tatetí
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
  '¿Quién es más probable que se quede dormido a los 15 minutos de empezar la película? 😴🍿',
  '¿Quién es más probable que robe comida del plato del otro diciendo "solo quiero probar"? 🍟👀',
  '¿Quién es más probable que pida mimos primero después de un día largo? 🥺🫂',
  '¿Quién es más probable que tarde 40 minutos eligiendo qué ver y termine poniendo lo de siempre? 🎬😂',
  '¿Quién es más probable que se ría en un momento serio? 🤭✨',
  '¿Quién es más probable que mande 10 reels seguidos a las 2 de la mañana? 📱🌙',
  '¿Quién es más probable que llore con el final de una película tierna? 😭💖',
  '¿Quién es más probable que se pierda incluso usando Google Maps? 🗺️🧭',
  '¿Quién es más probable que adopte un perrito o gatito sin avisar? 🐶🐱',
  '¿Quién es más probable que diga "5 minutitos más" cuando suena la alarma? ⏰🛌',
  '¿Quién es más probable que planee un viaje sorpresa de fin de semana? ✈️🏖️',
  '¿Quién es más probable que se coma el último pedazo de postre? 🍰🍓',
];

const CARDS_DECK: Record<'sweet' | 'deep' | 'spicy', string[]> = {
  sweet: [
    '🌸 ¿Cuál fue el primer pensamiento que tuviste la primera vez que hablamos o nos vimos?',
    '💖 ¿Qué pequeño gesto mío te hace sonreír automáticamente aunque tengas un mal día?',
    '🍓 Si mañana amaneciéramos en cualquier lugar del mundo juntos, ¿a dónde te gustaría que estemos?',
    '✨ ¿Cuál es tu recuerdo favorito de nosotros dos hasta ahora?',
    '🥰 ¿Qué canción o película te hace acordar a mí cada vez que la escuchás o ves?',
    '🌷 ¿Qué es lo que más extrañás cuando no estamos cerquita?',
    '💌 Describí en 3 palabras lo que sentís cuando estamos juntos.',
  ],
  deep: [
    '🌙 ¿Qué sueño o meta te encantaría que cumplamos juntos en los próximos 3 años?',
    '🏡 ¿Cómo te imaginás un domingo perfecto viviendo juntos de la mañana a la noche?',
    '💫 ¿Qué aprendiste sobre el amor desde que estamos juntos?',
    '🌊 ¿Cuándo fue el momento exacto en que sentiste una conexión especial conmigo?',
    '🌟 ¿Qué aventura loca deberíamos agregar sí o sí a nuestra lista de deseos?',
    '🕰️ Si pudieras congelar un momento nuestro para revivirlo siempre, ¿cuál elegirías?',
  ],
  spicy: [
    '🔥 ¿Qué prenda mía te encanta cómo me queda cuando nos vemos?',
    '💋 ¿Cuál es tu lugar favorito para que te dé un beso?',
    '🍷 Si tuviéramos toda una noche en una cabaña frente al mar sin celulares, ¿cómo empezaría?',
    '😏 ¿Qué fue lo más atrevido que pensaste la última vez que nos vimos?',
    '✨ ¿Qué detalle o caricia mía te vuelve loco/a al instante?',
    '🌶️ Confesá algo que tengas muchas ganas de hacer la próxima vez que estemos solos.',
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

  const leftName = mySeat === 'left' ? myName : peerName || 'Izquierda';
  const rightName = mySeat === 'right' ? myName : peerName || 'Derecha';
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
      <div className="screen-bezel cute-activity-bezel">
        {/* Barra Superior */}
        <div className="activity-header-bar">
          <button type="button" className="studio-home-btn" onClick={onBackToHub}>
            🏠 Menú
          </button>
          <div className="activity-tabs">
            <button
              type="button"
              className={`act-tab-btn ${s.tab === 'likely' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'likely' })}
            >
              💕 ¿Quién es más probable?
            </button>
            <button
              type="button"
              className={`act-tab-btn ${s.tab === 'cards' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'cards' })}
            >
              💌 Cartas de Pareja
            </button>
            <button
              type="button"
              className={`act-tab-btn ${s.tab === 'ttt' ? 'active' : ''}`}
              onClick={() => onUpdateState({ ...s, tab: 'ttt' })}
            >
              💖 Tatetí en Vivo
            </button>
          </div>
        </div>

        {/* Contenido del juego */}
        <div className="activity-content-center">
          {s.tab === 'likely' && (
            <div className="game-card-box">
              <span className="cute-pill-tag">Pregunta #{(s.likelyIdx % LIKELY_QUESTIONS.length) + 1}</span>
              <h2 className="game-big-question">{question}</h2>

              <div className="likely-buttons-row">
                <button
                  type="button"
                  className={`likely-vote-btn ${myVote === 'left' ? 'selected' : ''}`}
                  onClick={() => handleVote('left')}
                >
                  <span className="lv-emoji">👈💖</span>
                  <strong>{leftName}</strong>
                </button>
                <button
                  type="button"
                  className={`likely-vote-btn ${myVote === 'right' ? 'selected' : ''}`}
                  onClick={() => handleVote('right')}
                >
                  <span className="lv-emoji">💖👉</span>
                  <strong>{rightName}</strong>
                </button>
              </div>

              <div className="likely-status-area">
                {!bothVoted ? (
                  <p className="likely-waiting-text">
                    {myVote
                      ? `✅ Ya votaste · Esperando el voto secreto de ${peerName || 'tu pareja'}…`
                      : otherVote
                      ? `👀 ¡${peerName || 'Tu pareja'} ya votó en secreto! Elegí tu respuesta arriba.`
                      : '✨ Ambos eligen en secreto y se revela al mismo tiempo'}
                  </p>
                ) : (
                  <div className="likely-reveal-banner">
                    <div className="reveal-match-title">
                      {s.votes.left === s.votes.right
                        ? '🎉 ¡COINCIDIERON LOS DOS! 💖'
                        : '😂 ¡VOTARON DISTINTO!'}
                    </div>
                    <div className="reveal-details">
                      <span>
                        <strong>{leftName}</strong> votó a:{' '}
                        <em>{s.votes.left === 'left' ? leftName : rightName}</em>
                      </span>
                      <span>•</span>
                      <span>
                        <strong>{rightName}</strong> votó a:{' '}
                        <em>{s.votes.right === 'left' ? leftName : rightName}</em>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className="cute-primary-btn" onClick={handleNextLikely}>
                Siguiente pregunta ➜
              </button>
            </div>
          )}

          {s.tab === 'cards' && (
            <div className="game-card-box">
              <div className="deck-selector-row">
                <button
                  type="button"
                  className={`deck-chip ${s.cardCategory === 'sweet' ? 'active' : ''}`}
                  onClick={() => handleNextCard('sweet')}
                >
                  🌸 Tiernas
                </button>
                <button
                  type="button"
                  className={`deck-chip ${s.cardCategory === 'deep' ? 'active' : ''}`}
                  onClick={() => handleNextCard('deep')}
                >
                  🌙 Profundas
                </button>
                <button
                  type="button"
                  className={`deck-chip ${s.cardCategory === 'spicy' ? 'active' : ''}`}
                  onClick={() => handleNextCard('spicy')}
                >
                  🔥 Picantes
                </button>
              </div>

              <div className={`connection-card cat-${s.cardCategory}`}>
                <p className="connection-card-text">{currentCard}</p>
              </div>

              <button type="button" className="cute-primary-btn" onClick={() => handleNextCard()}>
                ✨ Sacar otra carta juntos
              </button>
            </div>
          )}

          {s.tab === 'ttt' && (
            <div className="game-card-box ttt-box">
              <div className="ttt-scoreboard">
                <span className={`ttt-score-pill ${s.turn === 'left' && !winner ? 'active-turn' : ''}`}>
                  💖 {leftName}: <strong>{s.scores.left}</strong>
                </span>
                <span className="ttt-vs">VS</span>
                <span className={`ttt-score-pill ${s.turn === 'right' && !winner ? 'active-turn' : ''}`}>
                  ⭐ {rightName}: <strong>{s.scores.right}</strong>
                </span>
              </div>

              <div className="ttt-status-text">
                {winner === 'draw' ? (
                  <strong>🤝 ¡Empate! Qué parejos están</strong>
                ) : winner ? (
                  <strong>
                    🎉 ¡Ganó {winner === 'left' ? `${leftName} 💖` : `${rightName} ⭐`}!
                  </strong>
                ) : s.turn === mySeat ? (
                  <span>✨ ¡Es tu turno! Tocá un casillero ({mySeat === 'left' ? '💖' : '⭐'})</span>
                ) : (
                  <span>⏳ Turno de {peerName || 'tu pareja'}…</span>
                )}
              </div>

              <div className="ttt-grid">
                {s.board.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ttt-cell ${cell ? 'filled' : ''}`}
                    onClick={() => handleCellClick(i)}
                  >
                    {cell === 'left' ? '💖' : cell === 'right' ? '⭐' : ''}
                  </button>
                ))}
              </div>

              <button type="button" className="cute-primary-btn" onClick={handleResetTtt}>
                🔄 Nueva partida
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
