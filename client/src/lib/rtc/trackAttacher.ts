// Enlace de pistas locales de audio/video y configuración de transceivers
import { preferHardwareCodecs } from './senderParams';

export interface LocalTracksState {
  pc: RTCPeerConnection;
  localStream: MediaStream | null;
  audioSender: RTCRtpSender | null;
  videoSender: RTCRtpSender | null;
}

export async function attachTracksToPc(
  state: LocalTracksState,
  onAudioSender: (s: RTCRtpSender) => void,
  onVideoSender: (s: RTCRtpSender) => void
): Promise<void> {
  const { pc, localStream } = state;
  if (!localStream) return;

  const aTrack = localStream.getAudioTracks()[0] || null;
  const vTrack = localStream.getVideoTracks()[0] || null;

  if (aTrack) {
    try { (aTrack as any).contentHint = 'speech'; } catch {}
    if (state.audioSender) {
      if (state.audioSender.track !== aTrack) await state.audioSender.replaceTrack(aTrack);
    } else {
      const sender = pc.addTrack(aTrack, localStream);
      onAudioSender(sender);
    }
  }

  if (vTrack) {
    try { (vTrack as any).contentHint = 'motion'; } catch {}
    if (state.videoSender) {
      if (state.videoSender.track !== vTrack) await state.videoSender.replaceTrack(vTrack);
    } else {
      const sender = pc.addTrack(vTrack, localStream);
      onVideoSender(sender);
      const tr = pc.getTransceivers().find((t) => t.sender === sender);
      if (tr) preferHardwareCodecs(tr);
    }
  }
}
