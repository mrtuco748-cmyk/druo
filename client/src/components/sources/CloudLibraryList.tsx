import React from 'react';
import { fmtSize, LibraryTitle } from './types';

interface Props {
  loadingLib: boolean;
  titles: LibraryTitle[];
  onSelectTitle: (t: LibraryTitle) => void;
  onDeleteTitle: (t: LibraryTitle) => void;
}

export const CloudLibraryList: React.FC<Props> = ({
  loadingLib, titles, onSelectTitle, onDeleteTitle,
}) => {
  return (
    <div className="lib-list">
      {loadingLib && <p className="hint-text">Cargando biblioteca…</p>}
      {!loadingLib && !titles.length && (
        <p className="hint-text">Todavía no hay películas subidas. Subí una arriba y queda guardada.</p>
      )}
      {titles.map((t) => (
        <div key={t.title} className="lib-item">
          <div>
            <strong>{t.title}</strong>
            <div className="lib-badges">
              {t.versions.map((v) => (
                <span key={v.key} className="badge">
                  {v.quality} · {fmtSize(v.size)}
                </span>
              ))}
            </div>
          </div>
          <div className="lib-actions">
            <button type="button" className="cta-primary" onClick={() => onSelectTitle(t)}>
              ▶️ Proyectar
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onDeleteTitle(t)}
              title="Borrar de la nube para liberar espacio"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
