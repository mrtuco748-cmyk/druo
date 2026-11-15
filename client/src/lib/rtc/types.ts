// Tipos e ICE servers por defecto para WebRTC
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

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302',
      'stun:stun.services.mozilla.com',
    ],
  },
];
