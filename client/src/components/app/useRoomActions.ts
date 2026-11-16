import { PlaybackState } from '../../lib/sync';
import { CamFraming } from '../CameraTile';
import { RoomSource } from '../CinemaScreen';
import { ActivityId } from '../CuteHub';
import { AppState } from './useAppState';

export function useRoomActions(st: AppState) {
  const updateMyFraming = (next: CamFraming) => {
    st.setMyFraming(next);
    localStorage.setItem('druo.framing', JSON.stringify({ zoom: next.zoom, y: next.y }));
    st.localStream?.getVideoTracks().forEach((t) => (t.enabled = next.on));
    st.localStream?.getAudioTracks().forEach((t) => (t.enabled = next.mic));
    st.sigRef.current?.send({ t: 'cam', ...next });
  };

  const handleSelectViewMode = (mode: 'cinema' | 'call-only' | 'focus-movie' | 'duo') => {
    if (st.mobile) return;
    st.setViewMode(mode);
    localStorage.setItem('druo.viewMode', mode);
  };

  const handleSelectActivity = (act: ActivityId) => {
    st.setActiveActivity(act);
    if (st.viewMode === 'call-only') handleSelectViewMode('cinema');
    st.sigRef.current?.send({ t: 'activity', activity: act });
  };

  const handleEmitSync = (state: { playing: boolean; position: number; playlistIndex?: number }, reason: string) => {
    const now = st.sigRef.current?.clock.now() || Date.now();
    const next: PlaybackState = {
      playing: state.playing, position: state.position, rate: 1,
      playlistIndex: state.playlistIndex ?? st.playback.playlistIndex ?? 0,
      updatedAt: now, by: st.myId,
    };
    st.setPlayback(next);
    st.sigRef.current?.send({ t: 'sync', state: { ...state, playlistIndex: next.playlistIndex }, at: now, reason });
  };

  const handleSelectLocalFile = (file: File, announce: boolean) => {
    if (st.localFileUrl) URL.revokeObjectURL(st.localFileUrl);
    st.setLocalFileUrl(URL.createObjectURL(file));
    if (announce) {
      const src: RoomSource = { kind: 'local', title: file.name, size: file.size };
      st.setSource(src); st.setActiveActivity('cinema');
      st.sigRef.current?.send({ t: 'source', source: src });
    }
  };

  return {
    updateMyFraming, handleSelectViewMode, handleSelectActivity, handleEmitSync, handleSelectLocalFile,
    handleMeSpeakingChange: (sp: boolean) => { st.setMeSpeaking(sp); st.sigRef.current?.send({ t: 'speaking', value: sp }); },
    handleChangePeerVolume: (v: number) => { const c = Math.max(0, Math.min(4.0, v)); st.setPeerVolume(c); localStorage.setItem('druo.peerVolume', String(c)); },
    handleSelectSource: (src: RoomSource) => {
      const now = st.sigRef.current?.clock.now() || Date.now();
      st.setPreferredVersionKey(null); st.setSource(src);
      st.setPlayback({ playing: true, position: 0, rate: 1, playlistIndex: src.playlistIndex || 0, updatedAt: now, by: st.myId });
      st.setActiveActivity('cinema'); st.sigRef.current?.send({ t: 'source', source: src });
    },
    handleClearSource: () => { st.setPreferredVersionKey(null); st.setSource(null); st.sigRef.current?.send({ t: 'source', source: null }); },
  };
}
