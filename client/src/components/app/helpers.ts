export const SESSION_ID = `s-${Math.random().toString(36).slice(2, 10)}`;

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  if (window.innerWidth < 820) return true;
  if (window.innerWidth <= 1024 && window.innerHeight <= 600) return true;
  return false;
}

export function getOrCreateId(key: string, prefix: string): string {
  let v = localStorage.getItem(key);
  if (!v) {
    v = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, v);
  }
  return v;
}

export async function toggleDocumentFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      if ((screen.orientation as any)?.lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } else {
      await document.exitFullscreen();
    }
  } catch {}
}

export async function acquireLocalMedia(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        return null;
      }
    }
  }
}
