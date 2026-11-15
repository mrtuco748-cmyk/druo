import { useEffect } from 'react';
import { PeerCall } from '../../lib/rtc';
import { Signaling } from '../../lib/signaling';
import { resumeSharedAudioContext } from '../../lib/voiceEngine';
import { acquireLocalMedia, SESSION_ID } from './helpers';
import { AppState } from './useAppState';
import { createSignalingMessageHandler } from './useSignalingHandler';

export function useRoomConnection(st: AppState) {
  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then((j) => st.setStorageReady(!!j.storage)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!st.entered) return;
    const ping = () => fetch('/api/keepalive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.myId }) }).catch(() => {});
    ping();
    const id = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, [st.entered, st.myId]);

  useEffect(() => {
    const other = st.peers.find((p) => p.id !== st.myId);
    st.rtcRef.current?.setRemotePeer(other ? other.id : null, other?.session);
    if (!other) { st.setPeerBuffering(false); st.setPeerSpeakingNet(false); }
  }, [st.peers, st.myId]);

  const unlockAllAudio = () => { resumeSharedAudioContext(); st.setMovieAudioBlocked(false); st.setVoiceAudioBlocked(false); };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    st.setFloatingReacts((p) => [...p, { id, emoji }]);
    setTimeout(() => st.setFloatingReacts((p) => p.filter((r) => r.id !== id)), 2600);
  };

  const enterTheater = async () => {
    unlockAllAudio();
    localStorage.setItem('druo.seat', st.mySeat); localStorage.setItem('druo.name', st.myName);
    st.setEntered(true);
    try { if ('wakeLock' in navigator) (navigator as any).wakeLock.request('screen').catch(() => {}); } catch {}

    const stream = await acquireLocalMedia();
    if (stream) st.setLocalStream(stream);

    const iceRes = await fetch('/api/ice').then((r) => r.json()).catch(() => ({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] }));
    const rtc = new PeerCall(
      st.myId,
      (data) => st.sigRef.current?.send({ t: 'signal', data }),
      (rem) => st.setRemoteStream((prev) => {
        const pIds = prev ? prev.getTracks().map((t) => `${t.id}-${t.readyState}`).sort().join(',') : '';
        const nIds = rem ? rem.getTracks().map((t) => `${t.id}-${t.readyState}`).sort().join(',') : '';
        return prev && pIds === nIds ? prev : new MediaStream(rem.getTracks());
      }),
      (s) => st.setStats(s)
    );
    st.rtcRef.current = rtc;
    await rtc.init(iceRes.iceServers || [], stream);

    let sig: Signaling | null = null;
    sig = new Signaling(
      { id: st.myId, session: SESSION_ID, name: st.myName, seat: st.mySeat, device: st.mobile ? 'mobile' : 'desktop' },
      createSignalingMessageHandler(st, spawnReaction, () => sig),
      (online) => st.setWsOnline(online)
    );
    st.sigRef.current = sig;
  };

  return { unlockAllAudio, spawnReaction, enterTheater };
}
