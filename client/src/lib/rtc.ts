// WebRTC P2P con "perfect negotiation", optimizado para conexiones difíciles e inestables:
// - Opus con in-band FEC + prioridad de red alta (el audio nunca se corta primero)
// - Video con aceleración por hardware (H.264 / VP8 primero, evitando el alto uso de CPU de VP9 por software)
// - Escalado adaptativo en 0ms vía RTCRtpSender.setParameters sin reiniciar el sensor físico de la cámara
// - Cola de renegociación segura (ninguna oferta se pierde si llega mientras otra está en vuelo)
// - Período de gracia ante micro-cortes de WebSocket y reinicio inteligente de ICE

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

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];

function mungeOpusSdp(sdp: string, maxAvgBitrate: number): string {
  const match = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!match) return sdp;
  const pt = match[1];
  const br = Math.max(24000, Math.min(128000, maxAvgBitrate || 48000));
  const extraParams = `stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=0;cbr=0;ptime=20;maxplaybackrate=48000;maxaveragebitrate=${br}`;
  const fmtpRegex = new RegExp(`(a=fmtp:${pt}\\s+[^\\r\\n]+)`);
  if (fmtpRegex.test(sdp)) {
    return sdp.replace(fmtpRegex, (m) => {
      const cleaned = m.replace(
        /;?(stereo|sprop-stereo|useinbandfec|usedtx|cbr|ptime|maxplaybackrate|maxaveragebitrate)=\d+/gi,
        ''
      );
      return `${cleaned};${extraParams}`;
    });
  }
  return sdp.replace(
    new RegExp(`(a=rtpmap:${pt}\\s+opus\/48000[^\\r\\n]*)`),
    `$1\r\na=fmtp:${pt} minptime=10;${extraParams}`
  );
}

export class PeerCall {
  private pc: RTCPeerConnection | null = null;
  private iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private pendingNegotiate = false;
  private pendingIceRestart = false;

  private remotePeerId: string | null = null;
  private remoteSession: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private localStream: MediaStream | null = null;
  private remoteStream = new MediaStream();
  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;
  private attachingPromise: Promise<void> | null = null;

  private videoPreset: VideoPresetId = 'auto';
  private audioPreset: AudioPresetId = 'voice';
  private autoCtrl = new AutoQualityController();
  private activeSpec: VideoPresetSpec = getVideoSpec('med');

  private statsTimer: any = null;
  private disconnectGraceTimer: any = null;
  private iceDisconnectTimer: any = null;
  private connectWatchdogTimer: any = null;

  private prevBytesOut = 0;
  private prevBytesIn = 0;
  private prevStatsAt = 0;
  private prevPacketsTotal = 0;
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

  async setRemotePeer(peerId: string | null, session?: string | null) {
    clearTimeout(this.disconnectGraceTimer);
    this.disconnectGraceTimer = null;

    if (!peerId) {
      // Si la llamada P2P sigue viva y fue solo un micro-corte del WebSocket, damos 8s de gracia
      if (
        this.pc &&
        (this.pc.connectionState === 'connected' ||
          this.pc.iceConnectionState === 'connected' ||
          this.pc.iceConnectionState === 'completed')
      ) {
        this.disconnectGraceTimer = setTimeout(() => {
          this.remotePeerId = null;
          this.remoteSession = null;
          this.resetPc();
        }, 8000);
        return;
      }
      this.remotePeerId = null;
      this.remoteSession = null;
      this.resetPc();
      return;
    }

    const sessionChanged =
      this.remotePeerId === peerId &&
      !!session &&
      !!this.remoteSession &&
      session !== this.remoteSession;
    const peerChanged = this.remotePeerId !== peerId;
    this.remotePeerId = peerId;
    if (session) this.remoteSession = session;

    if (sessionChanged || !this.pc) {
      this.resetPc();
      this.ensurePc();
    }

    await this.attachLocalTracks();

    if ((peerChanged || sessionChanged) && !this.polite) {
      await this.negotiate();
    }
    this.armConnectWatchdog();
  }

  private armConnectWatchdog() {
    clearTimeout(this.connectWatchdogTimer);
    if (!this.remotePeerId) return;
    this.connectWatchdogTimer = setTimeout(() => {
      const pc = this.pc;
      if (!pc || !this.remotePeerId) return;
      const connected =
        pc.connectionState === 'connected' ||
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed';
      if (!connected) {
        try {
          pc.restartIce?.();
        } catch {}
        this.negotiate(true);
      }
    }, 7500);
  }

  private resetPc() {
    clearInterval(this.statsTimer);
    clearTimeout(this.disconnectGraceTimer);
    clearTimeout(this.iceDisconnectTimer);
    clearTimeout(this.connectWatchdogTimer);
    try {
      this.pc?.close();
    } catch {}
    this.pc = null;
    this.videoSender = null;
    this.audioSender = null;
    this.attachingPromise = null;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteAnswerPending = false;
    this.pendingNegotiate = false;
    this.pendingIceRestart = false;
    this.pendingCandidates = [];
    this.remoteStream = new MediaStream();
    this.onRemoteStream(this.remoteStream);
  }

  private ensurePc() {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 4,
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
      const existing = this.remoteStream
        .getTracks()
        .find((t) => t.kind === track.kind && t.id !== track.id);
      if (existing) this.remoteStream.removeTrack(existing);
      if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
        this.remoteStream.addTrack(track);
      }
      this.onRemoteStream(this.remoteStream);
    };

    pc.oniceconnectionstatechange = () => {
      clearTimeout(this.iceDisconnectTimer);
      const st = pc.iceConnectionState;
      if (st === 'connected' || st === 'completed') {
        clearTimeout(this.connectWatchdogTimer);
        return;
      }
      if (st === 'failed') {
        // Si falla ICE, reiniciar de inmediato (impolite primero, polite a los 1.2s si sigue fallando)
        const delay = this.polite ? 1200 : 50;
        this.iceDisconnectTimer = setTimeout(() => {
          if (this.pc?.iceConnectionState === 'failed') {
            try {
              this.pc.restartIce?.();
            } catch {}
            this.negotiate(true);
          }
        }, delay);
      } else if (st === 'disconnected') {
        // Esperar 3.5s antes de reiniciar ICE: la mayoría de micro-cortes Wi-Fi se recuperan solos
        const delay = this.polite ? 4500 : 3200;
        this.iceDisconnectTimer = setTimeout(() => {
          if (
            this.pc &&
            (this.pc.iceConnectionState === 'disconnected' ||
              this.pc.iceConnectionState === 'failed')
          ) {
            try {
              this.pc.restartIce?.();
            } catch {}
            this.negotiate(true);
          }
        }, delay);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(this.connectWatchdogTimer);
      } else if (pc.connectionState === 'failed') {
        try {
          pc.restartIce?.();
        } catch {}
        this.negotiate(true);
      }
    };

    clearInterval(this.statsTimer);
    this.statsTimer = setInterval(() => this.pollStats(), 2500);
    return pc;
  }

  private preferHardwareCodecs(transceiver: RTCRtpTransceiver) {
    try {
      if (
        typeof RTCRtpSender.getCapabilities !== 'function' ||
        !transceiver.setCodecPreferences
      ) {
        return;
      }
      const caps = RTCRtpSender.getCapabilities('video');
      if (!caps || !caps.codecs?.length) return;
      // Priorizar H.264 y VP8 (acelerados por hardware en móviles y PCs) sobre VP9/AV1 (pesados en CPU)
      const rank = (mime: string) => {
        const m = mime.toLowerCase();
        if (m.includes('h264')) return 1;
        if (m.includes('vp8')) return 2;
        if (m.includes('vp9')) return 3;
        return 4;
      };
      const sorted = [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
      transceiver.setCodecPreferences(sorted);
    } catch {}
  }

  private async attachLocalTracks() {
    if (this.attachingPromise) return this.attachingPromise;
    this.attachingPromise = (async () => {
      try {
        const pc = this.ensurePc();
        if (!this.localStream) return;

        const aTrack = this.localStream.getAudioTracks()[0] || null;
        const vTrack = this.localStream.getVideoTracks()[0] || null;

        if (aTrack) {
          try {
            aTrack.contentHint = 'speech';
          } catch {}
          if (this.audioSender) {
            if (this.audioSender.track !== aTrack) {
              await this.audioSender.replaceTrack(aTrack);
            }
          } else {
            this.audioSender = pc.addTrack(aTrack, this.localStream);
          }
        }
        if (vTrack) {
          try {
            vTrack.contentHint = 'motion';
          } catch {}
          if (this.videoSender) {
            if (this.videoSender.track !== vTrack) {
              await this.videoSender.replaceTrack(vTrack);
            }
          } else {
            this.videoSender = pc.addTrack(vTrack, this.localStream);
            const tr = pc.getTransceivers().find((t) => t.sender === this.videoSender);
            if (tr) this.preferHardwareCodecs(tr);
          }
        }

        await this.applyAudioSenderParams();
        await this.applyVideoSenderParams(this.currentVideoSpec());
      } finally {
        this.attachingPromise = null;
      }
    })();
    return this.attachingPromise;
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
    if (!this.videoSender) return;
    try {
      const p: any = this.videoSender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.degradationPreference = 'balanced';
      p.encodings[0].active = spec.maxBitrate > 0;
      if (spec.maxBitrate > 0) {
        p.encodings[0].maxBitrate = spec.maxBitrate;
        p.encodings[0].maxFramerate = spec.fps;
        p.encodings[0].scaleResolutionDownBy = Math.max(1, spec.scaleDown || 1);
        p.encodings[0].priority = 'low';
        p.encodings[0].networkPriority = 'low';
      }
      await this.videoSender.setParameters(p);
    } catch {}
  }

  private async negotiate(iceRestart = false) {
    const pc = this.pc;
    if (!pc || !this.remotePeerId) return;
    if (this.makingOffer || pc.signalingState !== 'stable') {
      this.pendingNegotiate = true;
      if (iceRestart) this.pendingIceRestart = true;
      return;
    }
    try {
      this.makingOffer = true;
      this.pendingNegotiate = false;
      const doRestart = iceRestart || this.pendingIceRestart;
      this.pendingIceRestart = false;

      await this.attachLocalTracks();
      if (pc.signalingState !== 'stable') {
        this.pendingNegotiate = true;
        return;
      }

      const offer = await pc.createOffer(doRestart ? { iceRestart: true } : undefined);
      if (pc.signalingState !== 'stable') {
        this.pendingNegotiate = true;
        return;
      }
      const opusBps = (AUDIO_PRESETS[this.audioPreset] || AUDIO_PRESETS.voice).maxBitrate;
      await pc.setLocalDescription({
        type: 'offer',
        sdp: mungeOpusSdp(offer.sdp || '', opusBps),
      });
      this.sendSignal({ sdp: pc.localDescription });
    } catch (e) {
      console.warn('[rtc] negotiate error', e);
    } finally {
      this.makingOffer = false;
      if (this.pendingNegotiate && this.pc?.signalingState === 'stable') {
        const restart = this.pendingIceRestart;
        this.pendingNegotiate = false;
        this.pendingIceRestart = false;
        queueMicrotask(() => this.negotiate(restart));
      }
    }
  }

  async onSignal(from: string, session: string | undefined, data: any) {
    if (from && this.remotePeerId !== from) {
      await this.setRemotePeer(from, session);
    } else if (session && this.remoteSession && session !== this.remoteSession) {
      await this.setRemotePeer(from, session);
    }
    const pc = this.ensurePc();
    await this.attachLocalTracks();

    try {
      if (data.sdp) {
        const description = data.sdp as RTCSessionDescriptionInit;
        const readyForOffer =
          !this.makingOffer &&
          (pc.signalingState === 'stable' || this.isSettingRemoteAnswerPending);
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
          await pc.setLocalDescription({
            type: 'answer',
            sdp: mungeOpusSdp(answer.sdp || '', opusBps),
          });
          this.sendSignal({ sdp: pc.localDescription });
        }

        if (this.pendingNegotiate && pc.signalingState === 'stable') {
          const restart = this.pendingIceRestart;
          this.pendingNegotiate = false;
          this.pendingIceRestart = false;
          queueMicrotask(() => this.negotiate(restart));
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
      this.isSettingRemoteAnswerPending = false;
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
      let packetsReceived = 0;
      let packetsLostIn = 0;
      let frameW = 0;
      let frameH = 0;
      let fps = 0;

      const candidates = new Map<string, any>();
      report.forEach((s: any) => {
        if (s.type === 'local-candidate' || s.type === 'remote-candidate') {
          candidates.set(s.id, s);
        }
      });

      report.forEach((s: any) => {
        if (s.type === 'outbound-rtp' && !s.isRemote) {
          bytesOut += s.bytesSent || 0;
          if (s.kind === 'video') {
            frameW = s.frameWidth || frameW;
            frameH = s.frameHeight || frameH;
            fps = s.framesPerSecond || fps;
          }
        } else if (s.type === 'inbound-rtp' && !s.isRemote) {
          bytesIn += s.bytesReceived || 0;
          packetsReceived += s.packetsReceived || 0;
          packetsLostIn += Math.max(0, s.packetsLost || 0);
        } else if (s.type === 'remote-inbound-rtp') {
          if (typeof s.roundTripTime === 'number' && s.roundTripTime > 0) {
            rttMs = Math.round(s.roundTripTime * 1000);
          }
        } else if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
          if (typeof s.currentRoundTripTime === 'number' && s.currentRoundTripTime > 0) {
            rttMs = Math.round(s.currentRoundTripTime * 1000);
          }
          if (typeof s.availableOutgoingBitrate === 'number') {
            availOutBps = s.availableOutgoingBitrate;
          }
          const loc = candidates.get(s.localCandidateId);
          const rem = candidates.get(s.remoteCandidateId);
          if (loc?.candidateType === 'relay' || rem?.candidateType === 'relay') viaRelay = true;
        }
      });

      const now = Date.now();
      const dt = this.prevStatsAt ? (now - this.prevStatsAt) / 1000 : 0;
      const outKbps =
        dt > 0 ? Math.max(0, Math.round(((bytesOut - this.prevBytesOut) * 8) / 1000 / dt)) : 0;
      const inKbps =
        dt > 0 ? Math.max(0, Math.round(((bytesIn - this.prevBytesIn) * 8) / 1000 / dt)) : 0;
      const dRecv = Math.max(1, packetsReceived - this.prevPacketsTotal);
      const dLost = Math.max(0, packetsLostIn - this.prevPacketsLost);
      const lossRate = dRecv > 5 ? Math.min(1, dLost / (dRecv + dLost)) : 0;

      this.prevBytesOut = bytesOut;
      this.prevBytesIn = bytesIn;
      this.prevStatsAt = now;
      this.prevPacketsTotal = packetsReceived;
      this.prevPacketsLost = packetsLostIn;

      const isConnected =
        pc.connectionState === 'connected' ||
        pc.iceConnectionState === 'connected' ||
        pc.iceConnectionState === 'completed';

      if (this.videoPreset === 'auto' && isConnected) {
        const step = this.autoCtrl.step({ lossRate, rttMs, availOutBps });
        if (step.changed) {
          await this.applyVideoSenderParams(step.spec);
        }
      }

      this.onStats({
        connected: isConnected,
        viaRelay,
        rttMs,
        lossPct: Math.round(lossRate * 100),
        outKbps,
        inKbps,
        activeVideoLabel:
          this.videoPreset === 'auto' ? `Auto (${this.activeSpec.label})` : this.activeSpec.label,
        resolution:
          frameW && frameH
            ? `${frameW}×${frameH}`
            : `${this.activeSpec.width}×${this.activeSpec.height}`,
        fps: Math.round(fps || this.activeSpec.fps),
      });
    } catch {}
  }

  destroy() {
    this.resetPc();
  }
}

