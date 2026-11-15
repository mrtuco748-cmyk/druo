import React, { useEffect, useState } from 'react';
import { RoomSource, RoomSubs } from './CinemaScreen';
import { CloudTab } from './sources/CloudTab';
import { LinkTab } from './sources/LinkTab';
import { LocalTab } from './sources/LocalTab';

interface Props {
  open: boolean;
  storageReady: boolean;
  subs: RoomSubs | null;
  onClose: () => void;
  onSelectSource: (src: RoomSource) => void;
  onSelectLocalFile: (file: File, announce: boolean) => void;
  onSetSubs: (subs: RoomSubs | null) => void;
}

export const SourceDrawer: React.FC<Props> = ({
  open, storageReady, subs, onClose, onSelectSource, onSelectLocalFile, onSetSubs,
}) => {
  const [tab, setTab] = useState<'cloud' | 'link' | 'local'>('cloud');

  useEffect(() => {
    if (open) setTab('cloud');
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>☁️ Subir o elegir película</h3>
          <button type="button" className="icon-close" onClick={onClose}>✕</button>
        </header>

        <div className="modal-tabs">
          <button type="button" className={tab === 'cloud' ? 'active' : ''} onClick={() => setTab('cloud')}>
            ☁️ Subir a la nube
          </button>
          <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')}>
            🔗 Link directo
          </button>
          <button type="button" className={tab === 'local' ? 'active' : ''} onClick={() => setTab('local')}>
            📂 Archivo local
          </button>
        </div>

        {tab === 'cloud' && (
          <CloudTab open={open} storageReady={storageReady} onSelectSource={onSelectSource} onClose={onClose} />
        )}
        {tab === 'link' && <LinkTab onSelectSource={onSelectSource} onClose={onClose} />}
        {tab === 'local' && (
          <LocalTab subs={subs} onSelectLocalFile={onSelectLocalFile} onSetSubs={onSetSubs} onClose={onClose} />
        )}
      </div>
    </div>
  );
};
