// WebRTC P2P con "perfect negotiation", optimizado para mala conexión:
// - Opus con in-band FEC + DTX + mono + prioridad de red alta (el audio nunca se corta primero)
// - Video con degradationPreference = 'maintain-framerate' y control en vivo por RTCRtpSender.setParameters
// - Preferencia de códec VP9 -> VP8 -> H264
// - Controlador automático de calidad (AutoQualityController) leyendo getStats() cada 2.5 s
// - Reinicio de ICE automático si se corta la red

import {
  AUDIO_PRESETS,
  AudioPresetId,
  AutoQualityController,
  getVideoSpec,
  VideoPresetId,
  VideoPresetSpec,
} from './quality';

export interface CallStats {
  connected: boolean;
  viaRelay: boolean;
  rttMs: number;
  lossPct: number;
  outKbps: number;
  inKbps: number;
  activeVideoLabel: string;
  resolution: string;
  fps: number;
}

function mungeOpusSdp(sdp: string, _maxAvgBitrate: number): string {
  if (!sdp.includes('opus/48000')) return sdp;
  return sdp.replace(/(a=fmtp:\d+ [^\r\n]+)/g, (match) => {
    return `${match};stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=1`;
  });
}

export class PeerCall {
  private pc: RTCPeerConnection | null = null;
  private iceServers: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private remotePeerId: string | null = null;
  private remoteSession: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private localStream: MediaStream | null = null;
  private remoteStream = new MediaStream();
  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;

  private videoPreset: VideoPresetId = 'auto';
  private audioPreset: AudioPresetId = 'voice';
  private autoCtrl = new AutoQualityController();
  private activeSpec: VideoPresetSpec = getVideoSpec('med');

  private statsTimer: any = null;
  private prevBytesOut = 0;
  private prevBytesIn = 0;
  private prevStatsAt = 0;
  private prevPacketsSent = 0;
  private prevPacketsLost = 0;

  constructor(
    private myId: string,
    private sendSignal: (data: any) => void,
    private onRemoteStream: (s: MediaStream) => void,
    private onStats: (s: CallStats) => void
  ) {}

  async init(iceServers: RTCIceServer[], localStream: MediaStream | null) {
    if (iceServers?.length) this.iceServers = iceServers;
    this.localStream = localStream;
    this.ensurePc();
    await this.attachLocalTracks();
  }

  async setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (this.pc) await this.attachLocalTracks();
  }

  private get polite(): boolean {
    if (!this.remotePeerId) return true;
    return this.myId < this.remotePeerId;
  }

  setRemotePeer(peerId: string | null, session?: string | null) {
    if (!peerId) {
      this.remotePeerId = null;
      this.remoteSession = null;
      this.resetPc();
      return;
    }
    const sessionChanged = this.remotePeerId === peerId && session && this.remoteSession && session !== this.remoteSession;
    const peerChanged = this.remotePeerId !== peerId;
    this.remotePeerId = peerId;
    if (session) this.remoteSession = session;

    if (sessionChanged || !this.pc) {
      this.resetPc();
      this.ensurePc();
      this.attachLocalTracks();
    }
    if ((peerChanged || sessionChanged) && !this.polite) {
      this.negotiate();
    }
  }

  private resetPc() {
    clearInterval(this.statsTimer);
    try {
      this.pc?.close();
    } catch {}
    this.pc = null;
    this.videoSender = null;
    this.audioSender = null;
    this.pendingCandidates = [];
    this.remoteStream = new MediaStream();
    this.onRemoteStream(this.remoteStream);
  }

  private ensurePc() {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 2,
    });
    this.pc = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.sendSignal({ candidate });
    };

    pc.onnegotiationneeded = () => {
      this.negotiate();
    };

    pc.ontrack = (ev) => {
      const track = ev.track;
      const existing = this.remoteStream.getTracks().find((t) => t.kind === track.kind && t.id !== track.id);
      if (existing) this.remoteStream.removeTrack(existing);
      if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
        this.remoteStream.addTrack(track);
      }
      this.onRemoteStream(this.remoteStream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (!this.polite && pc.restartIce) {
          pc.restartIce();
          this.negotiate(true);
        }
      }
    };

    clearInterval(this.statsTimer);
    this.statsTimer = setInterval(() => this.pollStats(), 2500);
    return pc;
  }

  private preferEfficientCodecs(transceiver: RTCRtpTransceiver) {
    try {
      if (typeof RTCRtpSender.getCapabilities !== 'function' || !transceiver.setCodecPreferences) return;
      const caps = RTCRtpSender.getCapabilities('video');
      if (!caps) return;
      const rank = (mime: string) => {
        const m = mime.toLowerCase();
        if (m.includes('vp9')) return 1;
        if (m.includes('vp8')) return 2;
        if (m.includes('h264')) return 3;
        return 4;
      };
      const sorted = [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
      transceiver.setCodecPreferences(sorted);
    } catch {}
  }

  private async attachLocalTracks() {
    const pc = this.ensurePc();
    if (!this.localStream) return;

    const aTrack = this.localStream.getAudioTracks()[0] || null;
    const vTrack = this.localStream.getVideoTracks()[0] || null;

    if (aTrack) {
      aTrack.enabled = true;
      if (this.audioSender) {
        await this.audioSender.replaceTrack(aTrack);
      } else {
        this.audioSender = pc.addTrack(aTrack, this.localStream);
      }
    }
    if (vTrack) {
      try {
        vTrack.contentHint = 'motion';
      } catch {}
      if (this.videoSender) {
        await this.videoSender.replaceTrack(vTrack);
      } else {
        this.videoSender = pc.addTrack(vTrack, this.localStream);
        const tr = pc.getTransceivers().find((t) => t.sender === this.videoSender);
        if (tr) this.preferEfficientCodecs(tr);
      }
    }

    await this.applyAudioSenderParams();
    await this.applyVideoSenderParams(this.currentVideoSpec());
  }

  private currentVideoSpec(): VideoPresetSpec {
    if (this.videoPreset === 'auto') return this.autoCtrl.current();
    return getVideoSpec(this.videoPreset);
  }

  async setVideoPreset(id: VideoPresetId) {
    this.videoPreset = id;
    const spec = this.currentVideoSpec();
    await this.applyVideoSenderParams(spec);
  }

  async setAudioPreset(id: AudioPresetId) {
    this.audioPreset = id;
    await this.applyAudioSenderParams();
  }

  private async applyAudioSenderParams() {
    if (!this.audioSender) return;
    const preset = AUDIO_PRESETS[this.audioPreset] || AUDIO_PRESETS.voice;
    try {
      const p: any = this.audioSender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.encodings[0].maxBitrate = preset.maxBitrate;
      p.encodings[0].priority = 'high';
      p.encodings[0].networkPriority = 'high';
      await this.audioSender.setParameters(p);
    } catch {}
  }

  private async applyVideoSenderParams(spec: VideoPresetSpec) {
    this.activeSpec = spec;
    const vTrack = this.localStream?.getVideoTracks()[0];
    if (vTrack && spec.width > 0) {
      try {
        await vTrack.applyConstraints({
          width: { ideal: spec.width },
          height: { ideal: spec.height },
          frameRate: { ideal: spec.fps, max: spec.fps },
        });
      } catch {}
    }
    if (!this.videoSender) return;
    try {
      const p: any = this.videoSender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.degradationPreference = 'maintain-framerate';
      p.encodings[0].active = spec.maxBitrate > 0;
      if (spec.maxBitrate > 0) {
        p.encodings[0].maxBitrate = spec.maxBitrate;
        p.encodings[0].maxFramerate = spec.fps;
        p.encodings[0].scaleResolutionDownBy = 1;
        p.encodings[0].priority = 'low';
        p.encodings[0].networkPriority = 'low';
      }
      await this.videoSender.setParameters(p);
    } catch {}
  }

  private async negotiate(iceRestart = false) {
    const pc = this.pc;
    if (!pc || !this.remotePeerId || this.makingOffer) return;
    try {
      this.makingOffer = true;
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      if (pc.signalingState !== 'stable') return;
      const opusBps = (AUDIO_PRESETS[this.audioPreset] || AUDIO_PRESETS.voice).maxBitrate;
      await pc.setLocalDescription({ type: 'offer', sdp: mungeOpusSdp(offer.sdp || '', opusBps) });
      this.sendSignal({ sdp: pc.localDescription });
    } catch (e) {
      console.warn('[rtc] negotiate error', e);
    } finally {
      this.makingOffer = false;
    }
  }

  async onSignal(from: string, session: string | undefined, data: any) {
    if (from && this.remotePeerId !== from) {
      this.setRemotePeer(from, session);
    } else if (session && this.remoteSession && session !== this.remoteSession) {
      this.setRemotePeer(from, session);
    }
    const pc = this.ensurePc();

    try {
      if (data.sdp) {
        const description = data.sdp as RTCSessionDescriptionInit;
        const readyForOffer =
          !this.makingOffer && (pc.signalingState === 'stable' || this.isSettingRemoteAnswerPending);
        const offerCollision = description.type === 'offer' && !readyForOffer;

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;

        this.isSettingRemoteAnswerPending = description.type === 'answer';
        await pc.setRemoteDescription(description);
        this.isSettingRemoteAnswerPending = false;

        while (this.pendingCandidates.length) {
          const c = this.pendingCandidates.shift()!;
          try {
            await pc.addIceCandidate(c);
          } catch {}
        }

        if (description.type === 'offer') {
          const answer = await pc.createAnswer();
          const opusBps = (AUDIO_PRESETS[this.audioPreset] || AUDIO_PRESETS.voice).maxBitrate;
          await pc.setLocalDescription({ type: 'answer', sdp: mungeOpusSdp(answer.sdp || '', opusBps) });
          this.sendSignal({ sdp: pc.localDescription });
        }
      } else if (data.candidate) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(data.candidate);
          } else {
            this.pendingCandidates.push(data.candidate);
          }
        } catch (e) {
          if (!this.ignoreOffer) console.warn('[rtc] candidate err', e);
        }
      }
    } catch (e) {
      console.warn('[rtc] signal err', e);
    }
  }

  private async pollStats() {
    const pc = this.pc;
    if (!pc) return;
    try {
      const report = await pc.getStats();
      let bytesOut = 0;
      let bytesIn = 0;
      let rttMs = 0;
      let availOutBps: number | undefined;
      let viaRelay = false;
      let packetsSent = 0;
      let packetsLost = 0;
      let frameW = 0;
      let frameH = 0;
      let fps = 0;

      const candidates = new Map<string, any>();
      report.forEach((s: any) => {
        if (s.type === 'local-candidate' || s.type === 'remote-candidate') candidates.set(s.id, s);
      });

      report.forEach((s: any) => {
        if (s.type === 'outbound-rtp' && !s.isRemote) {
          bytesOut += s.bytesSent || 0;
          packetsSent += s.packetsSent || 0;
          if (s.kind === 'video') {
            frameW = s.frameWidth || frameW;
            frameH = s.frameHeight || frameH;
            fps = s.framesPerSecond || fps;
          }
        } else if (s.type === 'inbound-rtp' && !s.isRemote) {
          bytesIn += s.bytesReceived || 0;
          packetsLost += Math.max(0, s.packetsLost || 0);
        } else if (s.type === 'remote-inbound-rtp') {
          if (typeof s.roundTripTime === 'number') rttMs = Math.round(s.roundTripTime * 1000);
          packetsLost += Math.max(0, s.packetsLost || 0);
        } else if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
          if (typeof s.currentRoundTripTime === 'number') rttMs = Math.round(s.currentRoundTripTime * 1000);
          if (typeof s.availableOutgoingBitrate === 'number') availOutBps = s.availableOutgoingBitrate;
          const loc = candidates.get(s.localCandidateId);
          const rem = candidates.get(s.remoteCandidateId);
          if (loc?.candidateType === 'relay' || rem?.candidateType === 'relay') viaRelay = true;
        }
      });

      const now = Date.now();
      const dt = this.prevStatsAt ? (now - this.prevStatsAt) / 1000 : 0;
      const outKbps = dt > 0 ? Math.max(0, Math.round(((bytesOut - this.prevBytesOut) * 8) / 1000 / dt)) : 0;
      const inKbps = dt > 0 ? Math.max(0, Math.round(((bytesIn - this.prevBytesIn) * 8) / 1000 / dt)) : 0;
      const dSent = Math.max(1, packetsSent - this.prevPacketsSent);
      const dLost = Math.max(0, packetsLost - this.prevPacketsLost);
      const lossRate = Math.min(1, dLost / (dSent + dLost));

      this.prevBytesOut = bytesOut;
      this.prevBytesIn = bytesIn;
      this.prevStatsAt = now;
      this.prevPacketsSent = packetsSent;
      this.prevPacketsLost = packetsLost;

      if (this.videoPreset === 'auto' && pc.connectionState === 'connected') {
        const step = this.autoCtrl.step({ lossRate, rttMs, availOutBps });
        if (step.changed) {
          await this.applyVideoSenderParams(step.spec);
        }
      }

      this.onStats({
        connected: pc.connectionState === 'connected' || pc.iceConnectionState === 'connected',
        viaRelay,
        rttMs,
        lossPct: Math.round(lossRate * 100),
        outKbps,
        inKbps,
        activeVideoLabel:
          this.videoPreset === 'auto' ? `Auto (${this.activeSpec.label})` : this.activeSpec.label,
        resolution: frameW && frameH ? `${frameW}×${frameH}` : `${this.activeSpec.width}×${this.activeSpec.height}`,
        fps: Math.round(fps || this.activeSpec.fps),
      });
    } catch {}
  }

  destroy() {
    this.resetPc();
  }
}
