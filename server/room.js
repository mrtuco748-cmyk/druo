// Estado de LA sala (Druo tiene una sola). Sin dependencias de red para poder testearlo.

export const SEATS = ['left', 'right'];

export class Room {
  constructor({ now = () => Date.now(), maxPeers = 2 } = {}) {
    this.now = now;
    this.maxPeers = maxPeers;
    /** @type {Map<string, {id:string, session:string, name:string, seat:string, device:string, ws:any, lastSeen:number}>} */
    this.peers = new Map();
    this.source = null;
    this.playback = { playing: false, position: 0, rate: 1, updatedAt: now(), by: null };
    this.subs = null;
    this.cams = {};
    this.drawings = [];
    this.activity = 'hub';
    this.studioStrokes = [];
    this.studioBg = 'cream';
    this.sharedState = {};
  }

  /**
   * Une (o re-une) a alguien. Si el mismo id vuelve (recarga / reconexión) reemplaza la conexión vieja.
   * @returns {{ok:true, peer:any, replaced:any} | {ok:false, reason:string}}
   */
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
      id,
      session: String(info.session || '').slice(0, 64),
      name: String(info.name || '').slice(0, 40) || (seat === 'left' ? 'Izquierda' : 'Derecha'),
      seat,
      device: info.device === 'mobile' ? 'mobile' : 'desktop',
      ws,
      lastSeen: this.now(),
    };
    this.peers.set(id, peer);
    return { ok: true, peer, replaced: existing && existing.ws !== ws ? existing : null };
  }

  /** Solo saca al peer si la conexión que se cierra es la actual (evita que una conexión vieja borre a la nueva). */
  leave(id, ws) {
    const p = this.peers.get(id);
    if (p && p.ws === ws) {
      this.peers.delete(id);
      return true;
    }
    return false;
  }

  other(id) {
    for (const p of this.peers.values()) if (p.id !== id) return p;
    return null;
  }

  /** `at` es la hora (del server) en la que el cliente tomó la posición; se acota por seguridad. */
  setPlayback(state, by, at) {
    const now = this.now();
    const t = Number.isFinite(at) ? Math.min(now, Math.max(now - 3000, at)) : now;
    const position = Math.max(0, Number(state?.position) || 0);
    const playlistIndex = Number.isFinite(Number(state?.playlistIndex))
      ? Math.max(0, Math.floor(Number(state.playlistIndex)))
      : this.playback?.playlistIndex || 0;
    this.playback = {
      playing: !!state?.playing,
      position,
      rate: 1,
      playlistIndex,
      updatedAt: t,
      by,
    };
    return this.playback;
  }

  setSource(source, by) {
    this.source = source ? { ...source, by, setAt: this.now() } : null;
    this.playback = {
      playing: false,
      position: 0,
      rate: 1,
      playlistIndex: Number(source?.playlistIndex) || 0,
      updatedAt: this.now(),
      by,
    };
    this.subs = null;
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

  peerList() {
    return [...this.peers.values()].map(({ id, session, name, seat, device }) => ({ id, session, name, seat, device }));
  }

  snapshot() {
    return {
      peers: this.peerList(),
      source: this.source,
      playback: this.playback,
      subs: this.subs,
      cams: this.cams,
      drawings: this.drawings,
      activity: this.activity,
      studioStrokes: this.studioStrokes,
      studioBg: this.studioBg,
      sharedState: this.sharedState,
    };
  }
}
