// Reloj compartido tipo NTP: calcula el desfase entre el navegador y el servidor
// usando las muestras de menor RTT (las menos afectadas por congestión).

export interface ClockSample {
  c: number;    // hora cliente al enviar
  s: number;    // hora servidor al responder
  recv: number; // hora cliente al recibir
}

export function computeOffset(samples: ClockSample[]): { offset: number; rtt: number } {
  if (!samples.length) return { offset: 0, rtt: 0 };
  const derived = samples
    .map((x) => {
      const rtt = Math.max(0, x.recv - x.c);
      const offset = x.s - (x.c + rtt / 2);
      return { offset, rtt };
    })
    .sort((a, b) => a.rtt - b.rtt);

  const best = derived.slice(0, Math.max(1, Math.ceil(derived.length / 2)));
  const offsets = best.map((b) => b.offset).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  const offset = offsets.length % 2 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;
  return { offset: Math.round(offset), rtt: Math.round(best[0].rtt) };
}

export class ServerClock {
  private samples: ClockSample[] = [];
  offset = 0;
  rtt = 0;

  constructor(initialServerNow?: number) {
    if (typeof initialServerNow === 'number') {
      this.offset = initialServerNow - Date.now();
    }
  }

  addSample(c: number, s: number, recv = Date.now()) {
    this.samples.push({ c, s, recv });
    if (this.samples.length > 10) this.samples.shift();
    const res = computeOffset(this.samples);
    this.offset = res.offset;
    this.rtt = res.rtt;
  }

  now(): number {
    return Date.now() + this.offset;
  }
}
