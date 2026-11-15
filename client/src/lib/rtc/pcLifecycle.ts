// Configuración de callbacks y eventos de RTCPeerConnection
import { PeerCallState } from './peerState';
import { pollRtcStats } from './statsCollector';
import { CallStats } from './types';

export interface PcLifecycleOptions {
  iceServers: RTCIceServer[];
  polite: () => boolean;
  sendSignal: (d: any) => void;
  onTrack: (t: MediaStreamTrack) => void;
  onNegotiationNeeded: () => void;
  onIceRestart: () => void;
}

export function createPeerConnection(opts: PcLifecycleOptions): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: opts.iceServers,
    bundlePolicy: 'max-bundle',
    iceCandidatePoolSize: 4,
  });

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) opts.sendSignal({ candidate });
  };
  pc.onnegotiationneeded = () => opts.onNegotiationNeeded();
  pc.ontrack = (ev) => opts.onTrack(ev.track);

  let iceDisconnectTimer: any = null;
  pc.oniceconnectionstatechange = () => {
    clearTimeout(iceDisconnectTimer);
    const st = pc.iceConnectionState;
    if (st === 'connected' || st === 'completed') return;

    if (st === 'failed') {
      const delay = opts.polite() ? 1200 : 50;
      iceDisconnectTimer = setTimeout(() => {
        if (pc.iceConnectionState === 'failed') opts.onIceRestart();
      }, delay);
    } else if (st === 'disconnected') {
      const delay = opts.polite() ? 7500 : 6000;
      iceDisconnectTimer = setTimeout(() => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          opts.onIceRestart();
        }
      }, delay);
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') opts.onIceRestart();
  };

  return pc;
}

export function initPeerConnectionWithStats(
  st: PeerCallState,
  callbacks: {
    polite: () => boolean;
    sendSignal: (d: any) => void;
    onRemoteStream: (s: MediaStream) => void;
    onNegotiate: (restart?: boolean) => void;
    onStats: (s: CallStats) => void;
    applyVideoSpec: (spec: any) => Promise<void>;
  }
): RTCPeerConnection {
  const pc = createPeerConnection({
    iceServers: st.iceServers,
    polite: callbacks.polite,
    sendSignal: callbacks.sendSignal,
    onTrack: (t) => {
      const exist = st.remoteStream.getTracks().find((x) => x.kind === t.kind && x.id !== t.id);
      if (exist) st.remoteStream.removeTrack(exist);
      if (!st.remoteStream.getTracks().some((x) => x.id === t.id)) st.remoteStream.addTrack(t);
      callbacks.onRemoteStream(st.remoteStream);
    },
    onNegotiationNeeded: () => callbacks.onNegotiate(),
    onIceRestart: () => { try { pc.restartIce?.(); } catch {} callbacks.onNegotiate(true); },
  });

  clearInterval(st.statsTimer);
  st.statsTimer = setInterval(() => {
    pollRtcStats(st.pc, st.prevStats, st.videoPreset, st.activeSpec, st.autoCtrl, callbacks.applyVideoSpec, callbacks.onStats);
  }, 2500);

  return pc;
}
