import React, { useState } from 'react';
import { uploadMovieToB2, UploadProgress } from '../../lib/upload';
import { fmtSize } from './types';

interface Props {
  used: number;
  limit: number;
  onUploaded: (cleanTitle: string) => void;
}

export const CloudUploadForm: React.FC<Props> = ({ used, limit, onUploaded }) => {
  const [upTitle, setUpTitle] = useState('');
  const [upQuality, setUpQuality] = useState('720p');
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upProg, setUpProg] = useState<UploadProgress | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upFile) return;
    setUpErr(null);
    const cleanTitle = upTitle.trim() || upFile.name.replace(/\.[^.]+$/, '');
    try {
      await uploadMovieToB2(upFile, cleanTitle, upQuality, (p) => setUpProg(p));
      setUpProg(null); setUpFile(null);
      onUploaded(cleanTitle);
    } catch (err: any) {
      setUpErr(err.message || 'Error al subir');
      setUpProg(null);
    }
  };

  return (
    <form className="upload-box" onSubmit={handleUpload}>
      <div className="upload-header">
        <strong>Subir película a la sala</strong>
        <span className="storage-meter">Espacio usado: {fmtSize(used)} / {fmtSize(limit)}</span>
      </div>
      <div className="upload-row">
        <input type="text" placeholder="Nombre (ej: Interstellar)" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} />
        <select value={upQuality} onChange={(e) => setUpQuality(e.target.value)}>
          <option value="360p">360p (liviana p/ mal internet)</option>
          <option value="480p">480p (media)</option>
          <option value="720p">720p (HD)</option>
          <option value="1080p">1080p (Full HD)</option>
          <option value="original">Original</option>
        </select>
      </div>
      <div className="upload-row">
        <input
          type="file"
          accept="video/*,.mkv"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setUpFile(f);
            if (f && !upTitle) setUpTitle(f.name.replace(/\.[^.]+$/, ''));
          }}
        />
        <button type="submit" className="cta-primary" disabled={!upFile || !!upProg}>
          {upProg ? `Subiendo ${upProg.pct}%…` : '⬆️ Subir y proyectar'}
        </button>
      </div>
      <p className="hint-text">
        💡 Podés subir dos calidades con el mismo nombre. Si se corta internet, se reanuda desde el último bloque de 10 MB.
      </p>
      {upProg && <div className="progress-bar"><div style={{ width: `${upProg.pct}%` }} /></div>}
      {upErr && <div className="err-text">{upErr}</div>}
    </form>
  );
};
