import React, { useState } from 'react';
import { RoomSource } from '../CinemaScreen';

interface Props {
  onSelectSource: (src: RoomSource) => void;
  onClose: () => void;
}

export const LinkTab: React.FC<Props> = ({ onSelectSource, onClose }) => {
  const [linkInput, setLinkInput] = useState('');
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    setLinkBusy(true);
    setLinkErr(null);
    try {
      const r = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Link inválido');
      onSelectSource(j);
      setLinkInput('');
      onClose();
    } catch (err: any) {
      setLinkErr(err.message || 'No pude abrir ese link');
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <form className="modal-body" onSubmit={handleSubmit}>
      <label className="field-block">
        <span>Pegá un link de Cuevana, YouTube, MediaFire, Google Drive, Dropbox o un archivo .mp4 / .m3u8</span>
        <input
          type="url"
          placeholder="https://cuevanapro.org/pelicula/... o https://youtu.be/..."
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          required
        />
      </label>
      <p className="hint-text">
        • <strong>Cuevana (cuevanapro.org):</strong> pegás el link de la película o serie (ej. <em>https://cuevanapro.org/pelicula/buddy-wXqOV4</em>) y Druo extrae el video en alta definición sin popups ni anuncios, sincronizado para ambos.
        <br />• <strong>MediaFire / Google Drive / Dropbox:</strong> reproducen directo con soporte para adelantar/atrasar.
        <br />• <strong>YouTube y Playlists:</strong> pegá un video o una playlist (`?list=...`) y se reproduce de corrido sin cortes y sincronizada para los dos.
        <br />• <strong>Stream .m3u8 (HLS) o .mp4 directo:</strong> permite elegir calidad en vivo.
      </p>
      {linkErr && <div className="err-text">{linkErr}</div>}
      <button type="submit" className="cta-primary" disabled={linkBusy}>
        {linkBusy ? 'Abriendo…' : '🎬 Proyectar en la sala'}
      </button>
    </form>
  );
};
