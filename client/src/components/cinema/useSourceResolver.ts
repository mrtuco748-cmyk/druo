import { useEffect, useState } from 'react';
import { srtToVtt } from '../../lib/subtitles';
import { RoomSource, RoomSubs } from './types';

interface Opts {
  source: RoomSource | null;
  subs: RoomSubs | null;
  preferredVersionKey: string | null;
  localFileUrl: string | null;
  onLevelsLoaded: (lvls: { index: number; label: string; bitrate: number }[]) => void;
  onSelectVersionKey: (key: string) => void;
}

export function useSourceResolver({
  source, subs, preferredVersionKey, localFileUrl, onLevelsLoaded, onSelectVersionKey,
}: Opts) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [trackBlobUrl, setTrackBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    onLevelsLoaded([]);
    if (!source || source.kind === 'youtube') { setResolvedUrl(null); return; }
    if (source.kind === 'local') { setResolvedUrl(localFileUrl); return; }
    if (source.kind === 'library' && source.versions?.length) {
      const chosen = source.versions.find((v) => v.key === preferredVersionKey) || source.versions[source.versions.length - 1];
      if (!preferredVersionKey && chosen) onSelectVersionKey(chosen.key);
      setResolvedUrl(chosen ? `/api/stream?key=${encodeURIComponent(chosen.key)}` : null);
      return;
    }
    setResolvedUrl(source.url || null);
  }, [source, preferredVersionKey, localFileUrl]);

  useEffect(() => {
    if (!subs?.text) { setTrackBlobUrl(null); return; }
    const vtt = srtToVtt(subs.text, subs.offset || 0);
    const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    setTrackBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [subs?.text, subs?.offset]);

  return { resolvedUrl, trackBlobUrl };
}
