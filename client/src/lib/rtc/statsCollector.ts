// Recolección y cálculo de estadísticas WebRTC y calidad adaptativa
import { AutoQualityController, VideoPresetId, VideoPresetSpec } from '../quality';
import { CallStats } from './types';

export interface PrevStatsState {
  bytesOut: number;
  bytesIn: number;
  statsAt: number;
  packetsTotal: number;
  packetsLost: number;
}

export async function pollRtcStats(
  pc: RTCPeerConnection | null,
  prev: PrevStatsState,
  videoPreset: VideoPresetId,
  activeSpec: VideoPresetSpec,
  autoCtrl: AutoQualityController,
  onApplyVideoSpec: (s: VideoPresetSpec) => Promise<void>,
  onStats: (s: CallStats) => void
): Promise<void> {
  if (!pc) return;
  try {
    const report = await pc.getStats();
    let bytesOut = 0, bytesIn = 0, rttMs = 0, availOutBps: number | undefined;
    let viaRelay = false, packetsReceived = 0, packetsLostIn = 0;
    let frameW = 0, frameH = 0, fps = 0;

    const candidates = new Map<string, any>();
    report.forEach((s: any) => {
      if (s.type === 'local-candidate' || s.type === 'remote-candidate') candidates.set(s.id, s);
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
        if (typeof s.roundTripTime === 'number' && s.roundTripTime > 0) rttMs = Math.round(s.roundTripTime * 1000);
      } else if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
        if (typeof s.currentRoundTripTime === 'number' && s.currentRoundTripTime > 0) {
          rttMs = Math.round(s.currentRoundTripTime * 1000);
        }
        if (typeof s.availableOutgoingBitrate === 'number') availOutBps = s.availableOutgoingBitrate;
        const loc = candidates.get(s.localCandidateId);
        const rem = candidates.get(s.remoteCandidateId);
        if (loc?.candidateType === 'relay' || rem?.candidateType === 'relay') viaRelay = true;
      }
    });

    const now = Date.now();
    const dt = prev.statsAt ? (now - prev.statsAt) / 1000 : 0;
    const outKbps = dt > 0 ? Math.max(0, Math.round(((bytesOut - prev.bytesOut) * 8) / 1000 / dt)) : 0;
    const inKbps = dt > 0 ? Math.max(0, Math.round(((bytesIn - prev.bytesIn) * 8) / 1000 / dt)) : 0;
    const dRecv = Math.max(1, packetsReceived - prev.packetsTotal);
    const dLost = Math.max(0, packetsLostIn - prev.packetsLost);
    const lossRate = dRecv > 5 ? Math.min(1, dLost / (dRecv + dLost)) : 0;

    prev.bytesOut = bytesOut;
    prev.bytesIn = bytesIn;
    prev.statsAt = now;
    prev.packetsTotal = packetsReceived;
    prev.packetsLost = packetsLostIn;

    const isConnected =
      pc.connectionState === 'connected' ||
      pc.iceConnectionState === 'connected' ||
      pc.iceConnectionState === 'completed';

    if (videoPreset === 'auto' && isConnected) {
      const step = autoCtrl.step({ lossRate, rttMs, availOutBps });
      if (step.changed) await onApplyVideoSpec(step.spec);
    }

    onStats({
      connected: isConnected,
      viaRelay,
      rttMs,
      lossPct: Math.round(lossRate * 100),
      outKbps,
      inKbps,
      activeVideoLabel: videoPreset === 'auto' ? `Auto (${activeSpec.label})` : activeSpec.label,
      resolution: frameW && frameH ? `${frameW}×${frameH}` : `${activeSpec.width}×${activeSpec.height}`,
      fps: Math.round(fps || activeSpec.fps),
    });
  } catch {}
}
