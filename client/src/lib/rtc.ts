// Orquestador WebRTC P2P con Perfect Negotiation
import { AudioPresetId, getVideoSpec, VideoPresetId } from './quality';
import { executeNegotiate } from './rtc/offerNegotiator';
import { initPeerConnectionWithStats } from './rtc/pcLifecycle';
import { resetPeerCallState, updateRemotePeer } from './rtc/peerLifecycle';
import { PeerCallState } from './rtc/peerState';
import { applyAudioSenderParams, applyVideoSenderParams } from './rtc/senderParams';
import { processSignalData } from './rtc/signalingHandler';
import { attachTracksToPc } from './rtc/trackAttacher';
import { CallStats } from './rtc/types';

export { type CallStats } from './rtc/types';

export class PeerCall {
  private st = new PeerCallState();
  private audioPreset: AudioPresetId = 'voice';

  constructor(
    private myId: string, private sendSignal: (d: any) => void,
    private onRemoteStream: (s: MediaStream) => void, private onStats: (s: CallStats) => void
  ) {}

  private get polite() { return !this.st.remotePeerId || this.myId < this.st.remotePeerId; }

  async init(iceServers: RTCIceServer[], localStream: MediaStream | null) {
    if (iceServers?.length) this.st.iceServers = iceServers;
    this.st.localStream = localStream;
    this.ensurePc();
    await this.attachLocalTracks();
  }

  async setLocalStream(stream: MediaStream | null) {
    this.st.localStream = stream;
    if (this.st.pc) await this.attachLocalTracks();
  }

  async setRemotePeer(peerId: string | null, session?: string | null) {
    await updateRemotePeer(this.st, peerId, session, this.polite, () => this.ensurePc(), () => this.attachLocalTracks(), () => this.negotiate(), this.onRemoteStream);
  }

  private ensurePc(): RTCPeerConnection {
    if (this.st.pc) return this.st.pc;
    this.st.pc = initPeerConnectionWithStats(this.st, {
      polite: () => this.polite, sendSignal: this.sendSignal, onRemoteStream: this.onRemoteStream,
      onNegotiate: (r) => this.negotiate(r), onStats: this.onStats,
      applyVideoSpec: async (s) => { this.st.activeSpec = s; await applyVideoSenderParams(this.st.videoSender, s); },
    });
    return this.st.pc;
  }

  private async attachLocalTracks() {
    const pc = this.ensurePc();
    await attachTracksToPc(
      { pc, localStream: this.st.localStream, audioSender: this.st.audioSender, videoSender: this.st.videoSender },
      (s) => { this.st.audioSender = s; }, (s) => { this.st.videoSender = s; }
    );
    await applyAudioSenderParams(this.st.audioSender, this.audioPreset);
    const spec = this.st.videoPreset === 'auto' ? this.st.autoCtrl.current() : getVideoSpec(this.st.videoPreset);
    this.st.activeSpec = spec;
    await applyVideoSenderParams(this.st.videoSender, spec);
  }

  async setVideoPreset(id: VideoPresetId) {
    this.st.videoPreset = id;
    const spec = id === 'auto' ? this.st.autoCtrl.current() : getVideoSpec(id);
    this.st.activeSpec = spec;
    await applyVideoSenderParams(this.st.videoSender, spec);
  }

  async setAudioPreset(id: AudioPresetId) {
    this.audioPreset = id;
    await applyAudioSenderParams(this.st.audioSender, id);
  }

  private async negotiate(iceRestart = false) {
    if (!this.st.pc) return;
    await executeNegotiate({
      pc: this.st.pc, remotePeerId: this.st.remotePeerId, makingOffer: this.st.makingOffer,
      pendingNegotiate: this.st.pendingNegotiate, pendingIceRestart: this.st.pendingIceRestart,
      audioPreset: this.audioPreset, sendSignal: this.sendSignal, attachLocalTracks: () => this.attachLocalTracks(),
    }, iceRestart);
  }

  async onSignal(from: string, session: string | undefined, data: any) {
    if (from && this.st.remotePeerId !== from) await this.setRemotePeer(from, session);
    else if (session && this.st.remoteSession && session !== this.st.remoteSession) await this.setRemotePeer(from, session);
    await processSignalData({
      pc: this.ensurePc(), polite: this.polite, makingOffer: this.st.makingOffer,
      isSettingRemoteAnswerPending: this.st.isSettingRemoteAnswerPending, ignoreOffer: this.st.ignoreOffer,
      pendingCandidates: this.st.pendingCandidates, audioPreset: this.audioPreset,
      sendSignal: this.sendSignal, attachLocalTracks: () => this.attachLocalTracks(), onNegotiateNeeded: () => this.negotiate(),
    }, data);
  }

  destroy() { resetPeerCallState(this.st, this.onRemoteStream); }
}
