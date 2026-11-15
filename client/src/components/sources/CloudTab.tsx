import React, { useEffect, useState } from 'react';
import { RoomSource } from '../CinemaScreen';
import { CloudLibraryList } from './CloudLibraryList';
import { CloudUploadForm } from './CloudUploadForm';
import { LibraryTitle } from './types';

interface Props {
  open: boolean;
  storageReady: boolean;
  onSelectSource: (src: RoomSource) => void;
  onClose: () => void;
}

export const CloudTab: React.FC<Props> = ({ open, storageReady, onSelectSource, onClose }) => {
  const [titles, setTitles] = useState<LibraryTitle[]>([]);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(10 * 1024 ** 3);
  const [loadingLib, setLoadingLib] = useState(false);

  const refreshLibrary = () => {
    if (!storageReady) return;
    setLoadingLib(true);
    fetch('/api/library')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.titles)) {
          setTitles(j.titles); setUsed(j.used || 0); setLimit(j.limit || 10 * 1024 ** 3);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLib(false));
  };

  useEffect(() => {
    if (open && storageReady) refreshLibrary();
  }, [open, storageReady]);

  const handleUploaded = async (cleanTitle: string) => {
    const r = await fetch('/api/library').then((x) => x.json());
    if (Array.isArray(r.titles)) {
      setTitles(r.titles); setUsed(r.used || 0);
      const found = r.titles.find((t: LibraryTitle) => t.title === cleanTitle);
      if (found) { onSelectSource({ kind: 'library', title: found.title, versions: found.versions }); onClose(); }
    }
  };

  const handleDelete = async (t: LibraryTitle) => {
    const keys = t.versions.map((v) => v.key);
    await fetch('/api/library/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    });
    refreshLibrary();
  };

  if (!storageReady) {
    return (
      <div className="modal-body">
        <div className="notice-box">
          La nube B2 todavía no tiene credenciales cargadas en el servidor. Podés usar cualquier link de
          <strong> MediaFire, Google Drive, Dropbox, YouTube o MP4/.m3u8</strong> en la pestaña de al lado, o reproducir un archivo local sin gastar internet.
        </div>
      </div>
    );
  }

  return (
    <div className="modal-body">
      <CloudUploadForm used={used} limit={limit} onUploaded={handleUploaded} />
      <CloudLibraryList
        loadingLib={loadingLib} titles={titles}
        onSelectTitle={(t) => { onSelectSource({ kind: 'library', title: t.title, versions: t.versions }); onClose(); }}
        onDeleteTitle={handleDelete}
      />
    </div>
  );
};
