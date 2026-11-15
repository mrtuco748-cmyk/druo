// Facade del motor de audio y voz
export { getSharedAudioContext, resumeSharedAudioContext } from './audio/audioContext';
export { isHumanSyllableFrame, type SyllableFrameMetrics } from './audio/syllableMetrics';
export { createSyllableVoiceDetector, type SyllableDetectorOptions } from './audio/syllableDetector';
export { createRemoteVoiceProcessor, type RemoteVoiceChain } from './audio/remoteVoiceProcessor';
