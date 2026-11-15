import React from 'react';
import { GalleryCard } from './GalleryCard';
import { GalleryHeader } from './GalleryHeader';
import { GalleryProps } from './types';
import { useCinemaGallery } from './useCinemaGallery';

export const CinemaGallery: React.FC<GalleryProps> = ({ onSelectSource, onOpenSources }) => {
  const g = useCinemaGallery(onSelectSource);

  return (
    <div className="cinema-gallery-container">
      <GalleryHeader
        cat={g.cat}
        onSelectCat={g.setCat}
        search={g.search}
        onSearchChange={g.setSearch}
        onSubmitLink={g.handleCustomLinkSubmit}
        onOpenSources={onOpenSources}
        dbCount={g.dbMovies.length}
        totalCount={g.filteredMovies.length}
      />

      {g.errorMsg && (
        <div className="gallery-alert-error">
          <span>⚠️ {g.errorMsg}</span>
        </div>
      )}

      {g.loadingDb && g.cat === 'database' && (
        <div className="gallery-loading-notice">
          <span>Cargando biblioteca de la nube…</span>
        </div>
      )}

      {!g.filteredMovies.length && !g.loadingDb && (
        <div className="gallery-empty-notice">
          <p>No se encontraron películas con ese criterio.</p>
          {g.cat === 'database' && (
            <button type="button" className="cta-primary" onClick={onOpenSources}>
              ☁️ Subir película a la nube
            </button>
          )}
        </div>
      )}

      <div className="gallery-grid">
        {g.filteredMovies.map((movie) => (
          <GalleryCard
            key={movie.id}
            movie={movie}
            isResolving={g.resolvingId === movie.id}
            onSelect={g.handleSelectMovie}
          />
        ))}
      </div>
    </div>
  );
};
