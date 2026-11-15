import React, { useState } from 'react';
import { CinemaGallery } from './cinema/gallery/CinemaGallery';
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
  const [tab, setTab] = useState<'gallery' | 'cloud' | 'link' | 'local'>('gallery');

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>🎬 Película / Serie en pantalla</h3>
          <button type="button" className="icon-close" onClick={onClose}>✕</button>
        </header>

        <div className="modal-tabs">
          <button type="button" className={tab === 'gallery' ? 'active' : ''} onClick={() => setTab('gallery')}>
            🍿 Cartelera
          </button>
          <button type="button" className={tab === 'cloud' ? 'active' : ''} onClick={() => setTab('cloud')}>
            ☁️ Biblioteca nube
          </button>
          <button type="button" className={tab === 'link' ? 'active' : ''} onClick={() => setTab('link')}>
            🔗 Link directo
          </button>
          <button type="button" className={tab === 'local' ? 'active' : ''} onClick={() => setTab('local')}>
            📂 Archivo local
          </button>
        </div>

        {tab === 'gallery' && (
          <div style={{ maxHeight: 'min(520px, calc(80vh - 120px))', overflowY: 'auto' }}>
            <CinemaGallery
              onSelectSource={(s) => { onSelectSource(s); onClose(); }}
              onOpenSources={() => setTab('cloud')}
            />
          </div>
        )}
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
