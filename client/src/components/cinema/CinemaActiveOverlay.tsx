import React from 'react';
import { CinemaGallery } from './gallery/CinemaGallery';
import { RoomSource } from './types';

interface Props {
  source: RoomSource;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  onClearSource?: () => void;
  onSelectSource?: (src: RoomSource) => void;
  onOpenSources: () => void;
}

export const CinemaActiveOverlay: React.FC<Props> = ({
  source, showGallery, setShowGallery, onClearSource, onSelectSource, onOpenSources,
}) => (
  <>
    <div className="cinema-floating-bar" onClick={(e) => e.stopPropagation()}>
      <div className="cinema-bar-actions">
        <button type="button" className="cinema-bar-btn" onClick={() => setShowGallery(true)}>
          🍿 Cartelera
        </button>
        {onClearSource && (
          <button type="button" className="cinema-bar-btn cinema-bar-exit" onClick={onClearSource} title="Quitar película y volver a la cartelera">
            ✕ Volver a cartelera
          </button>
        )}
      </div>
      <span className="cinema-bar-title" title={source.title}>{source.title}</span>
    </div>

    {showGallery && (
      <div className="cinema-gallery-overlay" onClick={() => setShowGallery(false)}>
        <div className="cinema-gallery-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="cinema-gallery-header">
            <span className="cinema-gallery-header-title">🍿 Cartelera de Películas</span>
            <button type="button" className="cinema-gallery-close-btn" onClick={() => setShowGallery(false)}>
              ✕ Volver a la película
            </button>
          </div>
          <div className="cinema-gallery-scroll">
            <CinemaGallery
              onSelectSource={(s) => { setShowGallery(false); onSelectSource?.(s); }}
              onOpenSources={onOpenSources}
            />
          </div>
        </div>
      </div>
    )}
  </>
);
