// Manejo de colisiones de negociación y señalización SDP/ICE
import { AUDIO_PRESETS, AudioPresetId } from '../quality';
import { mungeOpusSdp } from './sdpUtils';

export interface SignalingContext {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  audioPreset: AudioPresetId;
  sendSignal: (d: any) => void;
  attachLocalTracks: () => Promise<void>;
  onNegotiateNeeded: () => void;
}

export async function processSignalData(ctx: SignalingContext, data: any): Promise<void> {
  const { pc } = ctx;
  if (data.sdp) {
    await ctx.attachLocalTracks();
    const description = data.sdp as RTCSessionDescriptionInit;
    const readyForOffer = !ctx.makingOffer && (pc.signalingState === 'stable' || ctx.isSettingRemoteAnswerPending);
    const offerCollision = description.type === 'offer' && !readyForOffer;

    ctx.ignoreOffer = !ctx.polite && offerCollision;
    if (ctx.ignoreOffer) return;

    ctx.isSettingRemoteAnswerPending = description.type === 'answer';
    await pc.setRemoteDescription(description);
    ctx.isSettingRemoteAnswerPending = false;

    while (ctx.pendingCandidates.length) {
      const c = ctx.pendingCandidates.shift()!;
      try { await pc.addIceCandidate(c); } catch {}
    }

    if (description.type === 'offer') {
      const answer = await pc.createAnswer();
      const opusBps = (AUDIO_PRESETS[ctx.audioPreset] || AUDIO_PRESETS.voice).maxBitrate;
      await pc.setLocalDescription({
        type: 'answer',
        sdp: mungeOpusSdp(answer.sdp || '', opusBps),
      });
      ctx.sendSignal({ sdp: pc.localDescription });
    }
  } else if (data.candidate) {
    try {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(data.candidate);
      } else {
        ctx.pendingCandidates.push(data.candidate);
      }
    } catch (e) {
      if (!ctx.ignoreOffer) console.warn('[rtc] candidate err', e);
    }
  }
}
