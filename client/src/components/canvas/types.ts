export interface DrawPoint {
  x: number; // 0..1 normalizado relativo al lienzo
  y: number; // 0..1
}

export interface DrawStroke {
  id: string;
  color: string;
  width: number;
  points: DrawPoint[];
}

export interface DrawEvent {
  t: 'draw';
  action: 'start' | 'move' | 'end' | 'commit' | 'clear';
  stroke?: DrawStroke;
  point?: DrawPoint;
}
