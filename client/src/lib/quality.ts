// Presets de calidad de videollamada (cámara + micrófono) y controlador adaptativo (Auto)
// pensado para conexiones malas o inestables.

export type VideoPresetId = 'auto' | 'off' | 'min' | 'low' | 'med' | 'high' | 'hd';
export type AudioPresetId = 'save' | 'voice' | 'clear' | 'hi';

export interface VideoPresetSpec {
  id: Exclude<VideoPresetId, 'auto'>;
  label: string;
  hint: string;
  width: number;
  height: number;
  fps: number;
  maxBitrate: number; // bps
  scaleDown: number;
}

export const VIDEO_LADDER: VideoPresetSpec[] = [
  { id: 'off',  label: 'Solo voz', hint: '0 kbps · cámara en pausa', width: 0,    height: 0,   fps: 0,  maxBitrate: 0,         scaleDown: 1 },
  { id: 'min',  label: 'Mínima',   hint: '60 kbps · 120p 10 fps',    width: 160,  height: 120, fps: 10, maxBitrate: 60_000,    scaleDown: 1 },
  { id: 'low',  label: 'Baja',     hint: '140 kbps · 240p 15 fps',   width: 320,  height: 240, fps: 15, maxBitrate: 140_000,   scaleDown: 1 },
  { id: 'med',  label: 'Media',    hint: '280 kbps · 360p 20 fps',   width: 480,  height: 360, fps: 20, maxBitrate: 280_000,   scaleDown: 1 },
  { id: 'high', label: 'Alta',     hint: '550 kbps · 480p 24 fps',   width: 640,  height: 480, fps: 24, maxBitrate: 550_000,   scaleDown: 1 },
  { id: 'hd',   label: 'HD',       hint: '1.1 Mbps · 720p 30 fps',   width: 1280, height: 720, fps: 30, maxBitrate: 1_100_000, scaleDown: 1 },
];

export const AUDIO_PRESETS: Record<AudioPresetId, { id: AudioPresetId; label: string; hint: string; maxBitrate: number }> = {
  save:  { id: 'save',  label: 'Ahorro',            hint: '24 kbps · aguanta cortes', maxBitrate: 24_000 },
  voice: { id: 'voice', label: 'Voz HD (recomendado)', hint: '48 kbps · voz cristalina', maxBitrate: 48_000 },
  clear: { id: 'clear', label: 'Claro Studio',      hint: '64 kbps · más cuerpo',     maxBitrate: 64_000 },
  hi:    { id: 'hi',    label: 'Ultra',             hint: '96 kbps · máxima calidad', maxBitrate: 96_000 },
};

export const MOVIE_CAPS: { id: number; label: string; hint: string }[] = [
  { id: 0,         label: 'Automática',       hint: 'Adapta según la red' },
  { id: 350_000,   label: 'Ahorro (240p–360p)', hint: '~150 MB/hora' },
  { id: 750_000,   label: 'Media (480p)',       hint: '~330 MB/hora' },
  { id: 1_600_000, label: 'Alta (720p)',        hint: '~700 MB/hora' },
  { id: 3_500_000, label: 'Full HD (1080p)',    hint: '~1.5 GB/hora' },
];

export function getVideoSpec(id: Exclude<VideoPresetId, 'auto'>): VideoPresetSpec {
  return VIDEO_LADDER.find((p) => p.id === id) || VIDEO_LADDER[3];
}

const AUTO_ORDER: Exclude<VideoPresetId, 'auto' | 'off'>[] = ['min', 'low', 'med', 'high', 'hd'];

export interface NetMetrics {
  lossRate: number;      // 0..1
  rttMs: number;         // ms
  availOutBps?: number;  // estimación WebRTC si existe
}

/**
 * Controlador adaptativo con histéresis: baja rápido ante pérdida/latencia alta,
 * sube despacio cuando la red se mantiene sana varios ciclos seguidos.
 */
export class AutoQualityController {
  idx = 2; // arranca en 'med' (360p 280 kbps)
  private goodStreak = 0;

  current(): VideoPresetSpec {
    return getVideoSpec(AUTO_ORDER[this.idx]);
  }

  step(m: NetMetrics): { changed: boolean; spec: VideoPresetSpec } {
    const prev = this.idx;
    const spec = this.current();
    const congested =
      m.lossRate > 0.06 ||
      m.rttMs > 420 ||
      (typeof m.availOutBps === 'number' && m.availOutBps > 0 && m.availOutBps < spec.maxBitrate * 0.85);

    if (congested) {
      this.goodStreak = 0;
      if (this.idx > 0) this.idx -= 1;
    } else {
      const nextSpec = getVideoSpec(AUTO_ORDER[Math.min(AUTO_ORDER.length - 1, this.idx + 1)]);
      const plenty =
        m.lossRate < 0.015 &&
        m.rttMs < 240 &&
        (!m.availOutBps || m.availOutBps > nextSpec.maxBitrate * 1.35);
      if (plenty) {
        this.goodStreak += 1;
        if (this.goodStreak >= 4 && this.idx < AUTO_ORDER.length - 1) {
          this.idx += 1;
          this.goodStreak = 0;
        }
      } else {
        this.goodStreak = 0;
      }
    }
    return { changed: this.idx !== prev, spec: this.current() };
  }
}
