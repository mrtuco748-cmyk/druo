import { useEffect, useRef, useState } from 'react';
import { createSyllableVoiceDetector, resumeSharedAudioContext } from '../../lib/voiceEngine';

interface Opts {
  stream: MediaStream | null;
  micEnabled: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
}

export function useSyllableSpeaking({ stream, micEnabled, onSpeakingChange }: Opts) {
  const [speaking, setSpeaking] = useState(false);
  const onSpeakingRef = useRef(onSpeakingChange);
  onSpeakingRef.current = onSpeakingChange;
  const micRef = useRef(micEnabled);
  micRef.current = micEnabled;

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setSpeaking(false);
      onSpeakingRef.current?.(false);
      return;
    }
    const cleanup = createSyllableVoiceDetector({
      stream,
      isMicEnabled: () => micRef.current,
      onSpeakingChange: (val) => { setSpeaking(val); onSpeakingRef.current?.(val); },
    });
    const resume = () => resumeSharedAudioContext();
    window.addEventListener('click', resume, { passive: true });
    window.addEventListener('touchstart', resume, { passive: true });
    return () => {
      cleanup();
      window.removeEventListener('click', resume);
      window.removeEventListener('touchstart', resume);
    };
  }, [stream]);

  useEffect(() => {
    if (!micEnabled && speaking) {
      setSpeaking(false);
      onSpeakingRef.current?.(false);
    }
  }, [micEnabled, speaking]);

  return speaking;
}
