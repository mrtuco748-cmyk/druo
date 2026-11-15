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

export const EMOJI_PRESETS = [
  '🩷', '💜', '✨', '🌙', '🐱', '🐶', '🍓', '🍒',
  '🎀', '👑', '🔥', '🌸', '🦊', '🐰', '🦋', '🍕', '🎮', '👻',
];
