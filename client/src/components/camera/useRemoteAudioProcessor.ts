import { useEffect, useRef, useState } from 'react';
import {
  createRemoteVoiceProcessor, getSharedAudioContext,
  RemoteVoiceChain, resumeSharedAudioContext,
} from '../../lib/voiceEngine';

interface Opts {
  isMe: boolean;
  stream: MediaStream | null;
  peerVolume: number;
  peerMuted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onAudioBlockedChange?: (blocked: boolean) => void;
}

export function useRemoteAudioProcessor({
  isMe, stream, peerVolume, peerMuted, audioRef, onAudioBlockedChange,
}: Opts) {
  const [audioBlocked, setAudioBlocked] = useState(false);
  const voiceChainRef = useRef<RemoteVoiceChain | null>(null);
  const curAudioTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isMe) return;
    const el = audioRef.current;
    if (!el) return;
    const aTrack = stream?.getAudioTracks()[0];
    if (!aTrack) {
      curAudioTrackIdRef.current = null; el.srcObject = null;
      voiceChainRef.current?.destroy(); voiceChainRef.current = null;
      setAudioBlocked(false); onAudioBlockedChange?.(false);
      return;
    }
    if (curAudioTrackIdRef.current === aTrack.id && voiceChainRef.current) return;
    curAudioTrackIdRef.current = aTrack.id;

    el.srcObject = new MediaStream([aTrack]);
    voiceChainRef.current?.destroy();
    const initialGain = peerMuted ? 0 : peerVolume;
    voiceChainRef.current = createRemoteVoiceProcessor(aTrack, initialGain);

    const ctx = getSharedAudioContext();
    const syncMuteState = () => {
      if (ctx && ctx.state === 'running' && voiceChainRef.current && el) {
        el.muted = false; el.volume = 0;
      } else if (el) {
        el.muted = peerMuted; el.volume = Math.max(0, Math.min(1, initialGain));
      }
    };
    if (ctx) { ctx.addEventListener?.('statechange', syncMuteState); ctx.resume().then(syncMuteState).catch(() => {}); }
    syncMuteState();

    el.play().then(() => { syncMuteState(); setAudioBlocked(false); onAudioBlockedChange?.(false); })
      .catch(() => { setAudioBlocked(true); onAudioBlockedChange?.(true); });

    const unlock = () => {
      resumeSharedAudioContext(); syncMuteState();
      el.play().then(() => { syncMuteState(); setAudioBlocked(false); onAudioBlockedChange?.(false); }).catch(() => {});
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock);
      ctx?.removeEventListener?.('statechange', syncMuteState);
      curAudioTrackIdRef.current = null; voiceChainRef.current?.destroy(); voiceChainRef.current = null;
    };
  }, [stream, isMe]);

  useEffect(() => {
    if (isMe) return;
    const target = peerMuted ? 0 : peerVolume;
    voiceChainRef.current?.setGain(target);
    const ctx = getSharedAudioContext();
    if (audioRef.current) {
      if (ctx && ctx.state === 'running' && voiceChainRef.current) {
        audioRef.current.muted = true; audioRef.current.volume = 0;
      } else {
        audioRef.current.muted = peerMuted; audioRef.current.volume = Math.max(0, Math.min(1, target));
      }
    }
  }, [peerVolume, peerMuted, isMe]);

  const unlockAudioManually = () => {
    resumeSharedAudioContext();
    if (audioRef.current) {
      audioRef.current.play().then(() => { setAudioBlocked(false); onAudioBlockedChange?.(false); }).catch(() => {});
    }
  };

  return { audioBlocked, unlockAudioManually };
}
