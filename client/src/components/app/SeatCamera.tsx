import React from 'react';
import { CameraTile, CamFraming } from '../CameraTile';
import { AppState } from './useAppState';

interface Props {
  st: AppState;
  side: 'left' | 'right';
  isMe: boolean;
  otherPeer: { id: string; name: string } | null;
  onChangeFraming: (next: CamFraming) => void;
  onMeSpeakingChange: (sp: boolean) => void;
  onChangePeerVolume: (v: number) => void;
}

export const SeatCamera: React.FC<Props> = ({
  st, side, isMe, otherPeer, onChangeFraming, onMeSpeakingChange, onChangePeerVolume,
}) => (
  <CameraTile
    side={side}
    label={isMe ? st.myName : otherPeer?.name || (side === 'left' ? 'Izquierda' : 'Derecha')}
    isMe={isMe}
    online={isMe ? true : !!otherPeer}
    stream={isMe ? st.localStream : st.remoteStream}
    framing={isMe ? st.myFraming : st.peerFraming}
    onChangeFraming={isMe ? onChangeFraming : undefined}
    onSpeakingChange={isMe ? onMeSpeakingChange : st.setPeerSpeaking}
    externalSpeaking={!isMe ? st.peerSpeakingNet : false}
    onAudioBlockedChange={!isMe ? st.setVoiceAudioBlocked : undefined}
    peerVolume={st.peerVolume}
    onChangePeerVolume={onChangePeerVolume}
    peerMuted={st.peerMuted}
    onTogglePeerMuted={() => st.setPeerMuted((m) => !m)}
  />
);
