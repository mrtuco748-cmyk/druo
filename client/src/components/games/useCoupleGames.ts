import { useState } from 'react';
import { CARDS_DECK, checkWinner, LIKELY_QUESTIONS } from './questionsDeck';
import { DEFAULT_GAMES_STATE, GamesState } from './types';

interface Opts {
  mySeat: 'left' | 'right';
  myName: string;
  peerName?: string;
  state: GamesState;
  onUpdateState: (next: GamesState) => void;
}

export function useCoupleGames({ mySeat, myName, peerName, state, onUpdateState }: Opts) {
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);
  const s: GamesState = {
    ...DEFAULT_GAMES_STATE, ...state,
    votes: state?.votes || {},
    board: Array.isArray(state?.board) && state.board.length === 9 ? state.board : Array(9).fill(null),
    scores: state?.scores || { left: 0, right: 0 },
    leftEmoji: state?.leftEmoji || '🩷', rightEmoji: state?.rightEmoji || '💜',
    customLikely: Array.isArray(state?.customLikely) ? state.customLikely : [],
    customCards: state?.customCards || {},
  };

  const leftName = mySeat === 'left' ? myName : peerName || '1';
  const rightName = mySeat === 'right' ? myName : peerName || '2';
  const otherSeat: 'left' | 'right' = mySeat === 'left' ? 'right' : 'left';
  const myVote = s.votes[mySeat], otherVote = s.votes[otherSeat], bothVoted = Boolean(myVote && otherVote);

  const allLikely = [...(s.customLikely || []), ...LIKELY_QUESTIONS];
  const activeCat = s.cardCategory || 'sweet';
  const allCards = [...(s.customCards?.[activeCat] || []), ...(CARDS_DECK[activeCat] || CARDS_DECK.sweet)];

  const handleSelectEmoji = (side: 'left' | 'right', em: string) => {
    onUpdateState({ ...s, leftEmoji: side === 'left' ? em : s.leftEmoji, rightEmoji: side === 'right' ? em : s.rightEmoji });
    setEditingSide(null);
  };

  const handleStepLikely = (delta: number) => {
    const len = allLikely.length;
    onUpdateState({ ...s, likelyIdx: (s.likelyIdx + delta + len) % len, votes: {} });
  };

  const handleStepCard = (delta: number, cat?: 'sweet' | 'deep' | 'spicy') => {
    const nextCat = cat || activeCat;
    const deck = [...(s.customCards?.[nextCat] || []), ...(CARDS_DECK[nextCat] || CARDS_DECK.sweet)];
    onUpdateState({ ...s, cardCategory: nextCat, cardIdx: cat ? 0 : (s.cardIdx + delta + deck.length) % deck.length });
  };

  const handleAddPrompt = (text: string) => {
    if (s.tab === 'likely') onUpdateState({ ...s, customLikely: [text, ...(s.customLikely || [])], likelyIdx: 0, votes: {} });
    else onUpdateState({ ...s, customCards: { ...(s.customCards || {}), [activeCat]: [text, ...(s.customCards?.[activeCat] || [])] }, cardIdx: 0 });
  };

  const winner = checkWinner(s.board);
  const handleCellClick = (idx: number) => {
    if (winner || s.board[idx] !== null || s.turn !== mySeat) return;
    const nextBoard = [...s.board]; nextBoard[idx] = mySeat;
    const w = checkWinner(nextBoard);
    const nextScores = { ...s.scores };
    if (w === 'left') nextScores.left += 1; if (w === 'right') nextScores.right += 1;
    onUpdateState({ ...s, board: nextBoard, turn: otherSeat, scores: nextScores });
  };

  return {
    s, editingSide, setEditingSide, leftName, rightName, myVote, bothVoted,
    allLikely, activeCat, allCards, winner,
    handleSelectEmoji, handleStepLikely, handleStepCard, handleAddPrompt, handleCellClick,
  };
}
