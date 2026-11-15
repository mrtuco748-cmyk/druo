export interface MovieVersion {
  key: string;
  quality: string;
  file: string;
  size: number;
}

export interface RoomSource {
  kind: 'library' | 'file' | 'hls' | 'youtube' | 'local' | 'embed';
  title: string;
  url?: string;
  id?: string;
  listId?: string;
  playlist?: string[];
  playlistIndex?: number;
  versions?: MovieVersion[];
  via?: string;
  size?: number;
  by?: string;
}

export interface RoomSubs {
  name: string;
  text: string;
  offset: number;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
export function loadYouTubeApi(): Promise<any> {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec), h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
