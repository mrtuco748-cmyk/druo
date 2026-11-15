// Gestión de ciclo de vida del peer remoto y limpieza de estado
import { PeerCallState } from './peerState';

export function resetPeerCallState(st: PeerCallState, onRemoteStream: (s: MediaStream) => void): void {
  clearInterval(st.statsTimer);
  try { st.pc?.close(); } catch {}
  st.pc = null;
  st.videoSender = null;
  st.audioSender = null;
  st.makingOffer = false;
  st.pendingCandidates = [];
  st.remoteStream = new MediaStream();
  onRemoteStream(st.remoteStream);
}

export async function updateRemotePeer(
  st: PeerCallState,
  peerId: string | null,
  session: string | null | undefined,
  polite: boolean,
  ensurePc: () => RTCPeerConnection,
  attachLocal: () => Promise<void>,
  negotiate: () => Promise<void>,
  onRemoteStream: (s: MediaStream) => void
): Promise<void> {
  const sChanged = st.remotePeerId === peerId && !!session && session !== st.remoteSession;
  const pChanged = st.remotePeerId !== peerId;
  st.remotePeerId = peerId;
  if (session) st.remoteSession = session;

  if (!peerId || sChanged || !st.pc) {
    resetPeerCallState(st, onRemoteStream);
    if (peerId) ensurePc();
  }
  if (peerId) {
    await attachLocal();
    if ((pChanged || sChanged) && !polite) await negotiate();
  }
}
