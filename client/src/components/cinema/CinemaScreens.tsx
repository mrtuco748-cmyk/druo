import React from 'react';
import { CinemaGallery } from './gallery/CinemaGallery';
import { RoomSource } from './types';

interface EmptyProps {
  onOpenSources: () => void;
  onSelectSource?: (src: RoomSource) => void;
}

export const CinemaEmptyScreen: React.FC<EmptyProps> = ({ onOpenSources, onSelectSource }) => {
  if (onSelectSource) {
    return <CinemaGallery onSelectSource={onSelectSource} onOpenSources={onOpenSources} />;
  }
  return (
    <div className="screen-empty">
      <div className="empty-marquee">SALA DRUO</div>
      <h2>La pantalla está lista</h2>
      <p>
        Elegí una película de la biblioteca, subí un archivo o pegá un link de Cuevana / YouTube / MediaFire / Drive.
        Lo que pongas, pauses o adelantes se sincroniza al instante en los dos.
      </p>
      <button type="button" className="cta-primary" onClick={onOpenSources}>
        🎬 Elegir o subir película
      </button>
    </div>
  );
};

interface LocalProps {
  title: string;
  onPickLocalFile: (f: File) => void;
}

export const CinemaLocalPrompt: React.FC<LocalProps> = ({ title, onPickLocalFile }) => (
  <div className="screen-empty">
    <div className="empty-marquee">ARCHIVO LOCAL SINCRONIZADO</div>
    <h2>{title}</h2>
    <p>Abrí el mismo archivo de video en tu dispositivo para verlo con 0 consumo de internet.</p>
    <label className="cta-primary file-label">
      📂 Elegir el archivo en este dispositivo
      <input
        type="file" accept="video/*,.mkv" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickLocalFile(f); }}
      />
    </label>
  </div>
);

interface EmbedProps {
  url: string;
}

export const CinemaEmbedScreen: React.FC<EmbedProps> = ({ url }) => (
  <div className="embed-wrap">
    <iframe src={url} className="cinema-embed" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
    <div className="embed-helper-banner">
      <span>🎬 Reproductor Cuevana listo</span>
      <small>Usá los controles dentro del video para reproducir, pausar o cambiar audio</small>
    </div>
  </div>
);
