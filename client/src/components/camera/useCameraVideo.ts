import { useEffect } from 'react';

export function useCameraVideo(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  stream: MediaStream | null,
  isOn: boolean
) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true; el.defaultMuted = true;
    (el as any).setAttribute('playsinline', 'true');
    if (el.srcObject !== (stream || null)) el.srcObject = stream || null;
    if (stream && isOn) el.play().catch(() => {});
  }, [stream, isOn]);
}
