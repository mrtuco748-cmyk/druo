// Cliente WebSocket de la sala con reconexión automática y sincronización de reloj.
import { ServerClock } from './clock';

export interface HelloInfo {
  id: string;
  session: string;
  name: string;
  seat: 'left' | 'right';
  device: 'desktop' | 'mobile';
}

export class Signaling {
  private ws: WebSocket | null = null;
  private timer: any = null;
  private pingTimer: any = null;
  private closed = false;
  private backoff = 500;
  readonly clock = new ServerClock();
  connected = false;

  constructor(
    private info: HelloInfo,
    private onMsg: (m: any) => void,
    private onStatus: (online: boolean) => void
  ) {
    this.connect();
  }

  updateInfo(partial: Partial<HelloInfo>) {
    this.info = { ...this.info, ...partial };
    this.send({ t: 'hello', ...this.info });
  }

  private connect() {
    if (this.closed) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.backoff = 500;
      this.onStatus(true);
      this.send({ t: 'hello', ...this.info });
      this.pingNow();
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.pingNow(), 4000);
    };

    ws.onmessage = (ev) => {
      let m: any;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.t === 'pong') {
        this.clock.addSample(m.c, m.s, Date.now());
        return;
      }
      if (m.t === 'welcome' && typeof m.now === 'number') {
        this.clock.addSample(Date.now(), m.now, Date.now());
      }
      this.onMsg(m);
    };

    ws.onclose = (ev) => {
      this.connected = false;
      this.onStatus(false);
      clearInterval(this.pingTimer);
      if (this.closed || ev.code === 4002) return; // 4002 = reemplazado por otra pestaña
      const wait = Math.min(8000, this.backoff);
      this.backoff = Math.min(8000, this.backoff * 1.6);
      this.timer = setTimeout(() => this.connect(), wait);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }

  private pingNow() {
    this.send({ t: 'ping', c: Date.now() });
  }

  send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  destroy() {
    this.closed = true;
    clearTimeout(this.timer);
    clearInterval(this.pingTimer);
    try {
      this.ws?.close();
    } catch {}
  }
}
