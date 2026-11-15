export type StudioTool =
  | 'pen' | 'marker' | 'neon' | 'airbrush' | 'eraser' | 'bucket'
  | 'pan' | 'line' | 'rect' | 'circle' | 'heart' | 'star' | 'eyedropper';

export type StudioBg = string;

export interface StudioPoint {
  x: number;
  y: number;
}

export interface StudioStroke {
  id: string;
  author?: string;
  tool: StudioTool;
  color: string;
  size: number;
  opacity: number;
  points: StudioPoint[];
  filled?: boolean;
}

export interface StudioEvent {
  t: 'studio';
  action: 'live' | 'commit' | 'remove' | 'replace' | 'bg' | 'clear' | 'cursor' | 'pictionary';
  stroke?: StudioStroke | null;
  strokes?: StudioStroke[];
  id?: string;
  bg?: StudioBg;
  cursor?: { x: number; y: number; color: string; tool: string } | null;
  from?: string;
  name?: string;
}

export const WORLD_W = 1400;
export const WORLD_H = 900;

export const KAWAII_PALETTE = [
  '#4a3b52', '#ff85a2', '#ff5c8a', '#ffb385', '#ffe082', '#8ce99a',
  '#74e3c4', '#91c9ff', '#b89eff', '#f3a6ff', '#ffadad', '#ffffff',
];

export const BG_COLORS: Record<string, string> = {
  night: '#180d17', pink: '#3b172c', plum: '#1d152e', grid: '#231222',
  cream: '#fff7ee', white: '#ffffff', pastelPink: '#ffdbe9',
  mint: '#e3faee', sky: '#e3f2fd', dots: '#fff2f7', gridLight: '#fff9fc',
};

export const BG_PRESET_LIST: { id: StudioBg; pattern?: 'grid' | 'dots' }[] = [
  { id: 'night' }, { id: 'pink' }, { id: 'plum' }, { id: 'grid', pattern: 'grid' },
  { id: 'white' }, { id: 'cream' }, { id: 'pastelPink' }, { id: 'mint' },
  { id: 'sky' }, { id: 'dots', pattern: 'dots' }, { id: 'gridLight', pattern: 'grid' },
];

export function resolveBgColor(mode: StudioBg): string {
  if (BG_COLORS[mode]) return BG_COLORS[mode];
  if (typeof mode === 'string' && mode.startsWith('#')) return mode;
  return '#180d17';
}
