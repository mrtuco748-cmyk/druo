import React from 'react';
import { OptionsMenu } from '../OptionsMenu';
import { QualityDrawer } from '../QualityDrawer';
import { SourceDrawer } from '../SourceDrawer';
import { toggleDocumentFullscreen } from './helpers';
import { AppState } from './useAppState';

interface Props {
  st: AppState;
  actions: {
    updateMyFraming: (next: any) => void;
    handleSelectViewMode: (mode: any) => void;
    handleSelectSource: (src: any) => void;
    handleSelectLocalFile: (f: File, announce: boolean) => void;
    handleChangePeerVolume: (v: number) => void;
  };
}

export const AppDrawers: React.FC<Props> = ({ st, actions }) => (
  <>
    <OptionsMenu
      open={st.showMenu} onClose={() => st.setShowMenu(false)} isMobile={st.mobile}
      viewMode={st.viewMode} onSelectViewMode={actions.handleSelectViewMode}
      onOpenSources={() => { st.setActiveActivity('cinema'); st.setShowSources(true); }}
      drawingActive={st.drawingActive} onToggleDrawing={() => st.setDrawingActive((d) => !d)}
      drawingColor={st.drawingColor} onSelectDrawingColor={st.setDrawingColor}
      myFraming={st.myFraming}
      onToggleMic={() => actions.updateMyFraming({ ...st.myFraming, mic: !st.myFraming.mic })}
      onToggleCam={() => actions.updateMyFraming({ ...st.myFraming, on: !st.myFraming.on })}
      onChangeFraming={actions.updateMyFraming} peerVolume={st.peerVolume}
      onChangePeerVolume={actions.handleChangePeerVolume} peerMuted={st.peerMuted}
      onTogglePeerMuted={() => st.setPeerMuted((m) => !m)} duckingEnabled={st.duckingEnabled}
      onToggleDucking={() => st.setDuckingEnabled((d) => !d)}
      onOpenQuality={() => st.setShowQuality(true)} onToggleFullscreen={toggleDocumentFullscreen}
    />
    <div className="floating-reacts" aria-hidden>
      {st.floatingReacts.map((r) => <span key={r.id} className="float-emoji">{r.emoji}</span>)}
    </div>
    <SourceDrawer
      open={st.showSources} storageReady={st.storageReady} subs={st.subs}
      onClose={() => st.setShowSources(false)} onSelectSource={actions.handleSelectSource}
      onSelectLocalFile={actions.handleSelectLocalFile}
      onSetSubs={(s) => { st.setSubs(s); st.sigRef.current?.send({ t: 'subs', subs: s }); }}
    />
    <QualityDrawer
      open={st.showQuality} onClose={() => st.setShowQuality(false)} isMobile={st.mobile}
      source={st.source} preferredVersionKey={st.preferredVersionKey} onSelectVersionKey={st.setPreferredVersionKey}
      hlsLevels={st.hlsLevels} hlsLevel={st.hlsLevel} onSelectHlsLevel={st.setHlsLevel}
      movieCapBps={st.movieCapBps} onSelectMovieCap={st.setMovieCapBps}
      videoPreset={st.videoPreset} onSelectVideoPreset={(id) => { st.setVideoPreset(id); st.rtcRef.current?.setVideoPreset(id); }}
      audioPreset={st.audioPreset} onSelectAudioPreset={(id) => { st.setAudioPreset(id); st.rtcRef.current?.setAudioPreset(id); }}
      myFraming={st.myFraming} onChangeFraming={actions.updateMyFraming}
      duckingEnabled={st.duckingEnabled} onToggleDucking={st.setDuckingEnabled}
      waitOnBuffer={st.waitOnBuffer} onToggleWaitOnBuffer={st.setWaitOnBuffer}
      stats={st.stats} viewMode={st.viewMode} onSelectViewMode={actions.handleSelectViewMode}
    />
  </>
);
