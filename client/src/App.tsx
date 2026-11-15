import React from 'react';
import { IconHome, IconVolume } from './components/KawaiiIcons';
import { ActivityStage } from './components/app/ActivityStage';
import { AppDrawers } from './components/app/AppDrawers';
import { LobbyScreen } from './components/app/LobbyScreen';
import { SeatCamera } from './components/app/SeatCamera';
import { TopBar } from './components/app/TopBar';
import { useAppState } from './components/app/useAppState';
import { useImmersiveMode } from './components/app/useImmersiveMode';
import { useRoomActions } from './components/app/useRoomActions';
import { useRoomConnection } from './components/app/useRoomConnection';

export const App: React.FC = () => {
  const st = useAppState();
  const conn = useRoomConnection(st);
  const actions = useRoomActions(st);
  const { immersiveMode, immersiveToast, handlePointerDown } = useImmersiveMode(st.mobile, st.viewMode, st.setViewMode);

  const otherPeer = st.peers.find((p) => p.id !== st.myId) || null;
  const leftIsMe = st.mySeat === 'left';
  const sendReaction = (emoji: string) => { conn.spawnReaction(emoji); st.sigRef.current?.send({ t: 'react', emoji }); };

  if (!st.entered) {
    return (
      <LobbyScreen
        myName={st.myName} mySeat={st.mySeat} onChangeName={st.setMyName}
        onChangeSeat={st.setMySeat} onEnter={conn.enterTheater}
      />
    );
  }

  return (
    <div
      className={`theater-shell ${st.mobile ? 'is-mobile-device' : 'is-desktop-device'} view-${st.viewMode} activity-${st.activeActivity} ${
        st.activeActivity !== 'cinema' ? 'is-interactive-activity' : 'is-cinema-activity'
      } ${immersiveMode ? 'is-ui-hidden' : ''}`}
      onPointerDown={handlePointerDown}
    >
      <TopBar
        activeActivity={st.activeActivity} wsOnline={st.wsOnline} hasOtherPeer={!!otherPeer}
        micOn={st.myFraming.mic} showMenu={st.showMenu} onSelectActivity={actions.handleSelectActivity}
        onReact={sendReaction} onToggleMic={() => actions.updateMyFraming({ ...st.myFraming, mic: !st.myFraming.mic })}
        onToggleMenu={() => st.setShowMenu((v) => !v)}
      />

      <AppDrawers st={st} actions={actions} />

      {(st.movieAudioBlocked || st.voiceAudioBlocked) && (
        <button type="button" className="master-audio-banner" onClick={conn.unlockAllAudio} aria-label="Unlock Audio">
          <IconVolume size={22} />
        </button>
      )}

      {st.viewMode === 'call-only' && !st.mobile && (
        <button type="button" className="call-return-btn" onClick={() => actions.handleSelectViewMode('cinema')} aria-label="Return">
          <IconHome size={20} />
        </button>
      )}

      <div className="theater-grid">
        <SeatCamera
          st={st} side="left" isMe={leftIsMe} otherPeer={otherPeer}
          onChangeFraming={actions.updateMyFraming} onMeSpeakingChange={actions.handleMeSpeakingChange}
          onChangePeerVolume={actions.handleChangePeerVolume}
        />
        <ActivityStage
          st={st} otherPeer={otherPeer} onSelectActivity={actions.handleSelectActivity}
          onSendReaction={sendReaction} onEmitSync={actions.handleEmitSync}
          onSelectLocalFile={actions.handleSelectLocalFile}
          onSelectSource={actions.handleSelectSource}
        />
        <SeatCamera
          st={st} side="right" isMe={!leftIsMe} otherPeer={otherPeer}
          onChangeFraming={actions.updateMyFraming} onMeSpeakingChange={actions.handleMeSpeakingChange}
          onChangePeerVolume={actions.handleChangePeerVolume}
        />
      </div>

      {immersiveToast && <div className="immersive-toast" aria-live="polite">{immersiveToast}</div>}
    </div>
  );
};
