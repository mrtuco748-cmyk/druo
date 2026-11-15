// Creación y negociación de ofertas SDP con restart y reintentos
import { AUDIO_PRESETS, AudioPresetId } from '../quality';
import { mungeOpusSdp } from './sdpUtils';

export interface NegotiateContext {
  pc: RTCPeerConnection;
  remotePeerId: string | null;
  makingOffer: boolean;
  pendingNegotiate: boolean;
  pendingIceRestart: boolean;
  audioPreset: AudioPresetId;
  sendSignal: (d: any) => void;
  attachLocalTracks: () => Promise<void>;
}

export async function executeNegotiate(ctx: NegotiateContext, iceRestart = false): Promise<void> {
  const { pc } = ctx;
  if (!pc || !ctx.remotePeerId) return;
  if (ctx.makingOffer || pc.signalingState !== 'stable') {
    ctx.pendingNegotiate = true;
    if (iceRestart) ctx.pendingIceRestart = true;
    return;
  }

  try {
    ctx.makingOffer = true;
    ctx.pendingNegotiate = false;
    const doRestart = iceRestart || ctx.pendingIceRestart;
    ctx.pendingIceRestart = false;

    await ctx.attachLocalTracks();
    if (pc.signalingState !== 'stable') { ctx.pendingNegotiate = true; return; }

    const offer = await pc.createOffer(doRestart ? { iceRestart: true } : undefined);
    if (pc.signalingState !== 'stable') { ctx.pendingNegotiate = true; return; }

    const opusBps = (AUDIO_PRESETS[ctx.audioPreset] || AUDIO_PRESETS.voice).maxBitrate;
    await pc.setLocalDescription({
      type: 'offer',
      sdp: mungeOpusSdp(offer.sdp || '', opusBps),
    });
    ctx.sendSignal({ sdp: pc.localDescription });
  } catch (e) {
    console.warn('[rtc] negotiate err', e);
  } finally {
    ctx.makingOffer = false;
    if (ctx.pendingNegotiate && pc.signalingState === 'stable') {
      const restart = ctx.pendingIceRestart;
      ctx.pendingNegotiate = false;
      ctx.pendingIceRestart = false;
      queueMicrotask(() => executeNegotiate(ctx, restart));
    }
  }
}
