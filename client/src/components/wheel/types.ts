export interface WheelState {
  title: string;
  options: string[];
  rotation: number;
  winner: string | null;
  spinningAt: number;
}

export const DEFAULT_WHEEL_STATE: WheelState = {
  title: 'Food',
  options: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Tacos', 'Helado'],
  rotation: 0,
  winner: null,
  spinningAt: 0,
};

export const SLICE_COLORS = [
  '#6e2847', '#5e3a24', '#224d3e', '#263f5c',
  '#452a63', '#632c3b', '#542859', '#214d4b',
];
