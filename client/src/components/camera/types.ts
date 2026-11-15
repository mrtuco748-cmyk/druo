export interface CamFraming {
  zoom: number; // 1.0 .. 3.5 (por defecto 2.1 para encuadrar bien la cara)
  y: number;    // -30 .. 30 (% desplazamiento vertical)
  on: boolean;
  mic: boolean;
}
