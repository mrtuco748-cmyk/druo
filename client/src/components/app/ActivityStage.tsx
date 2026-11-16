import React from 'react';
import { CinemaScreen } from '../CinemaScreen';
import { CoupleGames } from '../CoupleGames';
import { ActivityId, CuteHub } from '../CuteHub';
import { DecisionWheel } from '../DecisionWheel';
import { DrawingStudio } from '../DrawingStudio';
import { RelaxRoom } from '../RelaxRoom';
import { AppState } from './useAppState';

interface Props {
  st: AppState;
  otherPeer: { id: string; name: string } | null;
  onSelectActivity: (act: ActivityId) => void;
  onSendReaction: (em: string) => void;
  onEmitSync: (state: { playing: boolean; position: number; playlistIndex?: number }, reason: string) => void;
  onSelectLocalFile: (f: File, announce: boolean) => void;
  onSelectSource?: (src: any) => void;
  onClearSource?: () => void;
}

export const ActivityStage: React.FC<Props> = ({
  st, otherPeer, onSelectActivity, onSendReaction, onEmitSync, onSelectLocalFile, onSelectSource, onClearSource,
}) => {
  if (st.activeActivity === 'hub') {
    return (
      <CuteHub
        myName={st.myName} peerName={otherPeer?.name} hasMovieLoaded={!!st.source}
        movieTitle={st.source?.title} onSelectActivity={onSelectActivity} onSendReaction={onSendReaction}
      />
    );
  }
  if (st.activeActivity === 'cinema') {
    return (
      <CinemaScreen
        source={st.source} playback={st.playback} subs={st.subs}
        serverNow={() => st.sigRef.current?.clock.now() || Date.now()}
        someoneSpeaking={st.peerSpeaking || st.peerSpeakingNet} duckingEnabled={st.duckingEnabled}
        waitOnBuffer={st.waitOnBuffer} peerBuffering={st.peerBuffering}
        preferredVersionKey={st.preferredVersionKey} hlsLevel={st.hlsLevel} movieCapBps={st.movieCapBps}
        onLevelsLoaded={st.setHlsLevels} onSelectVersionKey={st.setPreferredVersionKey} onEmitSync={onEmitSync}
        onEmitBuffering={(b) => st.sigRef.current?.send({ t: 'buffering', value: b })}
        onOpenSources={() => st.setShowSources(true)} localFileUrl={st.localFileUrl}
        onPickLocalFile={(f) => onSelectLocalFile(f, false)} drawingActive={st.drawingActive}
        drawingColor={st.drawingColor} peerName={otherPeer?.name} initialStrokes={st.initialDrawings}
        onEmitDraw={(ev) => st.sigRef.current?.send(ev)}
        onRegisterDrawReceiver={(r) => { st.drawReceiverRef.current = r; }}
        onCloseDrawing={() => st.setDrawingActive(false)} onClearDrawing={() => st.setInitialDrawings([])}
        onChangeDrawingColor={st.setDrawingColor} onToggleDrawing={() => st.setDrawingActive((d) => !d)}
        onAutoplayBlockedChange={st.setMovieAudioBlocked} onSelectSource={onSelectSource} onClearSource={onClearSource}
      />
    );
  }
  if (st.activeActivity === 'draw') {
    return (
      <DrawingStudio
        myId={st.myId} myName={st.myName} peerName={otherPeer?.name}
        initialStrokes={st.studioStrokes} initialBg={st.studioBg}
        onEmitStudio={(ev) => st.sigRef.current?.send(ev)}
        onRegisterStudioReceiver={(r) => { st.studioReceiverRef.current = r; }}
        onSyncLocalState={(strokes, bg) => { st.setStudioStrokes(strokes); st.setStudioBg(bg); }}
        onBackToHub={() => onSelectActivity('hub')}
      />
    );
  }
  if (st.activeActivity === 'games') {
    return (
      <CoupleGames
        myName={st.myName} peerName={otherPeer?.name} mySeat={st.mySeat} state={st.gamesState}
        onUpdateState={(next) => { st.setGamesState(next); st.sigRef.current?.send({ t: 'shared', section: 'games', data: next }); }}
        onBackToHub={() => onSelectActivity('hub')}
      />
    );
  }
  if (st.activeActivity === 'wheel') {
    return (
      <DecisionWheel
        state={st.wheelState}
        onUpdateState={(next) => { st.setWheelState(next); st.sigRef.current?.send({ t: 'shared', section: 'wheel', data: next }); }}
        onBackToHub={() => onSelectActivity('hub')}
      />
    );
  }
  return (
    <RelaxRoom
      state={st.relaxState} someoneSpeaking={st.meSpeaking || st.peerSpeaking || st.peerSpeakingNet}
      onUpdateState={(next) => { st.setRelaxState(next); st.sigRef.current?.send({ t: 'shared', section: 'relax', data: next }); }}
      onBackToHub={() => onSelectActivity('hub')}
    />
  );
};
