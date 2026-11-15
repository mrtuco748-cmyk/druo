import React from 'react';
import { GalleryCategory } from './types';

interface Props {
  cat: GalleryCategory;
  onSelectCat: (c: GalleryCategory) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onSubmitLink: (url: string) => void;
  onOpenSources?: () => void;
  dbCount: number;
  totalCount: number;
}

export const GalleryHeader: React.FC<Props> = ({
  cat, onSelectCat, search, onSearchChange, onSubmitLink, onOpenSources, dbCount, totalCount,
}) => {
  const isLink = search.trim().startsWith('http://') || search.trim().startsWith('https://');

  return (
    <div className="gallery-header">
      <div className="gallery-title-row">
        <div>
          <h2 className="gallery-main-title">Cartelera de Cine</h2>
          <p className="gallery-sub-title">Elegí una película para proyectarla y verla sincronizada juntos.</p>
        </div>
        {onOpenSources && (
          <button type="button" className="btn-ghost gallery-upload-btn" onClick={onOpenSources}>
            ☁️ Subir película propia
          </button>
        )}
      </div>

      <div className="gallery-nav-row">
        <div className="gallery-pills">
          <button
            type="button"
            className={`gallery-pill ${cat === 'all' ? 'active' : ''}`}
            onClick={() => onSelectCat('all')}
          >
            🎬 Todas ({totalCount})
          </button>
          <button
            type="button"
            className={`gallery-pill ${cat === 'database' ? 'active' : ''}`}
            onClick={() => onSelectCat('database')}
          >
            ☁️ Base de Datos ({dbCount})
          </button>
          <button
            type="button"
            className={`gallery-pill ${cat === 'cuevana' ? 'active' : ''}`}
            onClick={() => onSelectCat('cuevana')}
          >
            🍿 Cuevana
          </button>
          <button
            type="button"
            className={`gallery-pill ${cat === 'youtube' ? 'active' : ''}`}
            onClick={() => onSelectCat('youtube')}
          >
            ▶️ YouTube
          </button>
        </div>

        <div className="gallery-search-wrap">
          <input
            type="text"
            className="gallery-search-input"
            placeholder="Buscar título o pegar link (Cuevana, YouTube...)"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isLink) onSubmitLink(search);
            }}
          />
          {isLink && (
            <button
              type="button"
              className="gallery-quick-play-btn"
              onClick={() => onSubmitLink(search)}
            >
              ▶ Proyectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
