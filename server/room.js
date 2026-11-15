// Estado de la sala de Druo (sin dependencias de red para testing)
import { RoomDrawings } from './roomDrawings.js';

export const SEATS = ['left', 'right'];

export class Room {
  constructor({ now = () => Date.now(), maxPeers = 2 } = {}) {
    this.now = now;
    this.maxPeers = maxPeers;
    this.peers = new Map();
    this.source = null;
    this.playback = { playing: false, position: 0, rate: 1, updatedAt: now(), by: null };
    this.subs = null;
    this.cams = {};
    this.activity = 'hub';
    this.sharedState = {};
    this.drawEngine = new RoomDrawings();
  }

  get drawings() { return this.drawEngine.drawings; }
  set drawings(val) { this.drawEngine.drawings = val; }
  get studioStrokes() { return this.drawEngine.studioStrokes; }
  set studioStrokes(val) { this.drawEngine.studioStrokes = val; }
  get studioBg() { return this.drawEngine.studioBg; }
  set studioBg(val) { this.drawEngine.studioBg = val; }

  addDrawStroke(s) { this.drawEngine.addDrawStroke(s); }
  clearDrawings() { this.drawEngine.clearDrawings(); }
  addStudioStroke(s) { this.drawEngine.addStudioStroke(s); }
  removeStudioStroke(id) { this.drawEngine.removeStudioStroke(id); }
  clearStudioStrokes() { this.drawEngine.clearStudioStrokes(); }

  join(info, ws) {
    const id = String(info.id || '').slice(0, 64);
    if (!id) return { ok: false, reason: 'bad-id' };
    const existing = this.peers.get(id);
    if (!existing && this.peers.size >= this.maxPeers) return { ok: false, reason: 'full' };

    const others = [...this.peers.values()].filter((p) => p.id !== id);
    const wanted = SEATS.includes(info.seat) ? info.seat : existing?.seat || 'left';
    const taken = new Set(others.map((p) => p.seat));
    const seat = taken.has(wanted) ? SEATS.find((s) => !taken.has(s)) : wanted;

    const peer = {
      id, session: String(info.session || '').slice(0, 64),
      name: String(info.name || '').slice(0, 40) || (seat === 'left' ? 'Izquierda' : 'Derecha'),
      seat, device: info.device === 'mobile' ? 'mobile' : 'desktop', ws, lastSeen: this.now(),
    };
    this.peers.set(id, peer);
    return { ok: true, peer, replaced: existing && existing.ws !== ws ? existing : null };
  }

  leave(id, ws) {
    const p = this.peers.get(id);
    if (p && p.ws === ws) { this.peers.delete(id); return true; }
    return false;
  }

  other(id) {
    for (const p of this.peers.values()) if (p.id !== id) return p;
    return null;
  }

  setPlayback(state, by, at) {
    const now = this.now();
    const t = Number.isFinite(at) ? Math.min(now, Math.max(now - 3000, at)) : now;
    const position = Math.max(0, Number(state?.position) || 0);
    const playlistIndex = Number.isFinite(Number(state?.playlistIndex))
      ? Math.max(0, Math.floor(Number(state.playlistIndex))) : this.playback?.playlistIndex || 0;
    this.playback = { playing: !!state?.playing, position, rate: 1, playlistIndex, updatedAt: t, by };
    return this.playback;
  }

  setSource(source, by) {
    this.source = source ? { ...source, by, setAt: this.now() } : null;
    this.playback = { playing: false, position: 0, rate: 1, playlistIndex: Number(source?.playlistIndex) || 0, updatedAt: this.now(), by };
    this.subs = null;
  }

  peerList() {
    return [...this.peers.values()].map(({ id, session, name, seat, device }) => ({ id, session, name, seat, device }));
  }

  snapshot() {
    return {
      peers: this.peerList(), source: this.source, playback: this.playback,
      subs: this.subs, cams: this.cams, drawings: this.drawings,
      activity: this.activity, studioStrokes: this.studioStrokes, studioBg: this.studioBg, sharedState: this.sharedState,
    };
  }
}
