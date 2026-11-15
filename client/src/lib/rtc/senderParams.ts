// Configuración de codecs y encoders WebRTC (H.264/VP8, bitrates, prioridades)
import { AUDIO_PRESETS, AudioPresetId, VideoPresetSpec } from '../quality';

export function preferHardwareCodecs(transceiver: RTCRtpTransceiver): void {
  try {
    if (typeof RTCRtpSender.getCapabilities !== 'function' || !transceiver.setCodecPreferences) return;
    const caps = RTCRtpSender.getCapabilities('video');
    if (!caps || !caps.codecs?.length) return;

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

export async function applyAudioSenderParams(
  audioSender: RTCRtpSender | null,
  audioPreset: AudioPresetId
): Promise<void> {
  if (!audioSender) return;
  const preset = AUDIO_PRESETS[audioPreset] || AUDIO_PRESETS.voice;
  try {
    const p: any = audioSender.getParameters();
    if (!p.encodings || !p.encodings.length) p.encodings = [{}];
    p.encodings[0].maxBitrate = preset.maxBitrate;
    p.encodings[0].priority = 'high';
    p.encodings[0].networkPriority = 'high';
    await audioSender.setParameters(p);
  } catch {}
}

export async function applyVideoSenderParams(
  videoSender: RTCRtpSender | null,
  spec: VideoPresetSpec
): Promise<void> {
  if (!videoSender) return;
  try {
    const p: any = videoSender.getParameters();
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
    await videoSender.setParameters(p);
  } catch {}
}
