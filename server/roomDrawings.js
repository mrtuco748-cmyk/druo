// Manejo de trazos de dibujo en pantalla y en DrawingStudio
export class RoomDrawings {
  constructor() {
    this.drawings = [];
    this.studioStrokes = [];
    this.studioBg = 'cream';
  }

  addDrawStroke(stroke) {
    if (!stroke || !Array.isArray(stroke.points)) return;
    this.drawings.push(stroke);
    if (this.drawings.length > 200) {
      this.drawings.splice(0, this.drawings.length - 200);
    }
  }

  clearDrawings() {
    this.drawings = [];
  }

  addStudioStroke(stroke) {
    if (!stroke || !stroke.id) return;
    this.studioStrokes.push(stroke);
    if (this.studioStrokes.length > 500) {
      this.studioStrokes.splice(0, this.studioStrokes.length - 500);
    }
  }

  removeStudioStroke(id) {
    this.studioStrokes = this.studioStrokes.filter((s) => s.id !== id);
  }

  clearStudioStrokes() {
    this.studioStrokes = [];
  }
}
