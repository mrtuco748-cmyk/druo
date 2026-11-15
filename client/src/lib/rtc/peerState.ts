// Estructura de estado interno para la llamada WebRTC
import { AutoQualityController, getVideoSpec, VideoPresetId, VideoPresetSpec } from '../quality';
import { PrevStatsState } from './statsCollector';
import { DEFAULT_ICE_SERVERS } from './types';

export class PeerCallState {
  pc: RTCPeerConnection | null = null;
  iceServers = DEFAULT_ICE_SERVERS;
  makingOffer = false;
  ignoreOffer = false;
  isSettingRemoteAnswerPending = false;
  pendingNegotiate = false;
  pendingIceRestart = false;
  remotePeerId: string | null = null;
  remoteSession: string | null = null;
  pendingCandidates: RTCIceCandidateInit[] = [];
  localStream: MediaStream | null = null;
  remoteStream = new MediaStream();
  videoSender: RTCRtpSender | null = null;
  audioSender: RTCRtpSender | null = null;
  videoPreset: VideoPresetId = 'auto';
  autoCtrl = new AutoQualityController();
  activeSpec: VideoPresetSpec = getVideoSpec('med');
  statsTimer: any = null;
  prevStats: PrevStatsState = { bytesOut: 0, bytesIn: 0, statsAt: 0, packetsTotal: 0, packetsLost: 0 };
}
