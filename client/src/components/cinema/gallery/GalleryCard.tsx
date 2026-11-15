import React from 'react';
import { GalleryMovie } from './types';

interface Props {
  movie: GalleryMovie;
  isResolving: boolean;
  onSelect: (m: GalleryMovie) => void;
}

export const GalleryCard: React.FC<Props> = ({ movie, isResolving, onSelect }) => {
  const getBadgeClass = () => {
    if (movie.category === 'database') return 'badge-db';
    if (movie.category === 'cuevana') return 'badge-cuevana';
    return 'badge-yt';
  };

  return (
    <div
      className={`gallery-card ${isResolving ? 'is-loading' : ''}`}
      onClick={() => !isResolving && onSelect(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(movie); }}
    >
      <div className="gallery-poster-wrap">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="gallery-poster-img"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="gallery-poster-placeholder">
          <span>🎬</span>
        </div>
        <span className={`gallery-cat-badge ${getBadgeClass()}`}>{movie.badge}</span>
        {isResolving ? (
          <div className="gallery-card-loading">
            <span className="spinner-dot" />
            <span className="loading-label">Conectando…</span>
          </div>
        ) : (
          <div className="gallery-play-overlay">
            <span className="play-icon">▶</span>
          </div>
        )}
      </div>
      <div className="gallery-card-info">
        <h4 className="gallery-card-title" title={movie.title}>{movie.title}</h4>
        <div className="gallery-card-meta">
          {movie.year && <span>{movie.year}</span>}
          {movie.duration && <span>· {movie.duration}</span>}
        </div>
        {movie.desc && <p className="gallery-card-desc">{movie.desc}</p>}
      </div>
    </div>
  );
};
