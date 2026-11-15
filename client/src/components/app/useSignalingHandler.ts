import { Signaling } from '../../lib/signaling';
import { StudioEvent } from '../DrawingStudio';
import { AppState } from './useAppState';

export function createSignalingMessageHandler(
  st: AppState,
  spawnReaction: (emoji: string) => void,
  getSig: () => Signaling | null
) {
  return (m: any) => {
    if (m.t === 'welcome') {
      if (m.you?.seat) st.setMySeat(m.you.seat);
      if (m.state) {
        st.setPeers(m.state.peers || []);
        st.setSource(m.state.source || null);
        if (m.state.playback) st.setPlayback(m.state.playback);
        st.setSubs(m.state.subs || null);
        if (m.state.drawings) st.setInitialDrawings(m.state.drawings);
        if (m.state.activity) st.setActiveActivity(m.state.activity);
        if (Array.isArray(m.state.studioStrokes)) st.setStudioStrokes(m.state.studioStrokes);
        if (m.state.studioBg) st.setStudioBg(m.state.studioBg);
        if (m.state.sharedState?.games) st.setGamesState(m.state.sharedState.games);
        if (m.state.sharedState?.wheel) st.setWheelState(m.state.sharedState.wheel);
        if (m.state.sharedState?.relax) st.setRelaxState(m.state.sharedState.relax);
        const other = (m.state.peers || []).find((p: any) => p.id !== st.myId);
        if (other && m.state.cams?.[other.id]) st.setPeerFraming(m.state.cams[other.id]);
      }
      getSig()?.send({ t: 'cam', ...st.myFraming });
    } else if (m.t === 'peers') {
      st.setPeers(m.peers || []);
    } else if (m.t === 'signal') {
      st.rtcRef.current?.onSignal(m.from, m.session, m.data);
    } else if (m.t === 'sync' && m.playback) {
      st.setPlayback(m.playback);
    } else if (m.t === 'source') {
      st.setPreferredVersionKey(null);
      st.setSource(m.source || null);
      if (m.playback) st.setPlayback(m.playback);
      if (m.source) st.setActiveActivity('cinema');
    } else if (m.t === 'subs') {
      st.setSubs(m.subs || null);
    } else if (m.t === 'cam' && m.id !== st.myId) {
      st.setPeerFraming({ zoom: Number(m.zoom) || 1.0, y: Number(m.y) || 0, on: m.on !== false, mic: m.mic !== false });
    } else if (m.t === 'buffering') {
      st.setPeerBuffering(!!m.value);
    } else if (m.t === 'speaking') {
      st.setPeerSpeakingNet(!!m.value);
    } else if (m.t === 'react' && m.emoji) {
      spawnReaction(m.emoji);
    } else if (m.t === 'draw') {
      st.drawReceiverRef.current?.(m);
    } else if (m.t === 'activity' && m.activity) {
      st.setActiveActivity(m.activity);
    } else if (m.t === 'studio') {
      st.studioReceiverRef.current?.(m as StudioEvent);
    } else if (m.t === 'shared' && m.section && m.data) {
      if (m.section === 'games') st.setGamesState(m.data);
      else if (m.section === 'wheel') st.setWheelState(m.data);
      else if (m.section === 'relax') st.setRelaxState(m.data);
    }
  };
}
