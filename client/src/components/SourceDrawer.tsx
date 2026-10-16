import React, { useEffect, useState } from 'react';
import { uploadMovieToB2, UploadProgress } from '../lib/upload';
import { MovieVersion, RoomSource, RoomSubs } from './CinemaScreen';

interface LibraryTitle {
  title: string;
  versions: MovieVersion[];
  updatedAt: number;
}

interface Props {
  open: boolean;
  storageReady: boolean;
  subs: RoomSubs | null;
  onClose: () => void;
  onSelectSource: (src: RoomSource) => void;
  onSelectLocalFile: (file: File, announce: boolean) => void;
  onSetSubs: (subs: RoomSubs | null) => void;
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

export const SourceDrawer: React.FC<Props> = ({
  open,
  storageReady,
  subs,
  onClose,
  onSelectSource,
  onSelectLocalFile,
  onSetSubs,
}) => {
  const [tab, setTab] = useState<'cloud' | 'link' | 'local'>('link');
  const [titles, setTitles] = useState<LibraryTitle[]>([]);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(10 * 1024 ** 3);
  const [loadingLib, setLoadingLib] = useState(false);

  const [upTitle, setUpTitle] = useState('');
  const [upQuality, setUpQuality] = useState('720p');
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upProg, setUpProg] = useState<UploadProgress | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);

  const [linkInput, setLinkInput] = useState('');
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (storageReady && tab === 'link') setTab('cloud');
  }, [storageReady]);

  const refreshLibrary = () => {
    if (!storageReady) return;
    setLoadingLib(true);
    fetch('/api/library')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.titles)) {
          setTitles(j.titles);
          setUsed(j.used || 0);
          setLimit(j.limit || 10 * 1024 ** 3);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLib(false));
  };

  useEffect(() => {
    if (open && storageReady) refreshLibrary();
  }, [open, storageReady]);

  if (!open) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upFile) return;
    setUpErr(null);
    const cleanTitle = upTitle.trim() || upFile.name.replace(/\.[^.]+$/, '');
    try {
      await uploadMovieToB2(upFile, cleanTitle, upQuality, (p) => setUpProg(p));
      setUpProg(null);
      setUpFile(null);
      const r = await fetch('/api/library').then((x) => x.json());
      if (Array.isArray(r.titles)) {
        setTitles(r.titles);
        setUsed(r.used || 0);
        const found = r.titles.find((t: LibraryTitle) => t.title === cleanTitle);
        if (found) {
          onSelectSource({ kind: 'library', title: found.title, versions: found.versions });
          onClose();
        }
      }
    } catch (err: any) {
      setUpErr(err.message || 'Error al subir');
      setUpProg(null);
    }
  };

  const handleDeleteTitle = async (t: LibraryTitle) => {
    const keys = t.versions.map((v) => v.key);
    await fetch('/api/library/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    });
    refreshLibrary();
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>🎬 Película / Serie en pantalla</h3>
          <button type="button" className="icon-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="modal-tabs">
          <button
            type="button"
            className={tab === 'cloud' ? 'active' : ''}
            onClick={() => setTab('cloud')}
          >
            ☁️ Biblioteca nube
          </button>
          <button
            type="button"
            className={tab === 'link' ? 'active' : ''}
            onClick={() => setTab('link')}
          >
            🔗 Link (YouTube / MediaFire / Drive)
          </button>
          <button
            type="button"
            className={tab === 'local' ? 'active' : ''}
            onClick={() => setTab('local')}
          >
            📂 Archivo sin internet + Subtítulos
          </button>
        </div>

        {tab === 'cloud' && (
          <div className="modal-body">
            {!storageReady ? (
              <div className="notice-box">
                La nube B2 todavía no tiene credenciales cargadas en el servidor. Podés usar cualquier link de
                <strong> MediaFire, Google Drive, Dropbox, YouTube o MP4/.m3u8</strong> en la pestaña de al lado, o
                reproducir un archivo local sin gastar internet.
              </div>
            ) : (
              <>
                <form className="upload-box" onSubmit={handleUpload}>
                  <div className="upload-header">
                    <strong>Subir película a la sala</strong>
                    <span className="storage-meter">
                      Espacio usado: {fmtSize(used)} / {fmtSize(limit)}
                    </span>
                  </div>
                  <div className="upload-row">
                    <input
                      type="text"
                      placeholder="Nombre (ej: Interstellar)"
                      value={upTitle}
                      onChange={(e) => setUpTitle(e.target.value)}
                    />
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
                    💡 Podés subir dos calidades con el mismo nombre (ej. 360p para el celu y 720p para tu PC). Si se
                    corta internet mientras sube, se reanuda desde el último bloque de 10 MB.
                  </p>
                  {upProg && (
                    <div className="progress-bar">
                      <div style={{ width: `${upProg.pct}%` }} />
                    </div>
                  )}
                  {upErr && <div className="err-text">{upErr}</div>}
                </form>

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
                        <button
                          type="button"
                          className="cta-primary"
                          onClick={() => {
                            onSelectSource({ kind: 'library', title: t.title, versions: t.versions });
                            onClose();
                          }}
                        >
                          ▶️ Proyectar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleDeleteTitle(t)}
                          title="Borrar de la nube para liberar espacio"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'link' && (
          <form className="modal-body" onSubmit={handleLinkSubmit}>
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
              <br />• <strong>YouTube:</strong> se reproduce sincronizado para los dos.
              <br />• <strong>Stream .m3u8 (HLS) o .mp4 directo:</strong> permite elegir calidad en vivo.
            </p>
            {linkErr && <div className="err-text">{linkErr}</div>}
            <button type="submit" className="cta-primary" disabled={linkBusy}>
              {linkBusy ? 'Abriendo…' : '🎬 Proyectar en la sala'}
            </button>
          </form>
        )}

        {tab === 'local' && (
          <div className="modal-body">
            <div className="upload-box">
              <strong>Modo cero internet (archivo en cada dispositivo)</strong>
              <p className="hint-text">
                Si los dos tienen el archivo en su compu/celu (por ejemplo pasado por WhatsApp o Telegram), elegilo acá:
                la película se ve en calidad máxima sin gastar un solo mega de internet y Druo sincroniza las pausas y
                saltos.
              </p>
              <label className="cta-primary file-label">
                📂 Abrir archivo de video local
                <input
                  type="file"
                  accept="video/*,.mkv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onSelectLocalFile(f, true);
                      onClose();
                    }
                  }}
                />
              </label>
            </div>

            <div className="upload-box">
              <strong>Subtítulos compartidos (.srt o .vtt)</strong>
              <p className="hint-text">
                Si cargás un archivo de subtítulos, se les muestra a los dos automáticamente.
              </p>
              <div className="upload-row">
                <label className="btn-ghost file-label">
                  💬 Cargar archivo .srt / .vtt
                  <input
                    type="file"
                    accept=".srt,.vtt,text/plain"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const text = await f.text();
                      onSetSubs({ name: f.name, text, offset: 0 });
                    }}
                  />
                </label>
                {subs && (
                  <>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => onSetSubs({ ...subs, offset: Number(((subs.offset || 0) - 0.5).toFixed(1)) })}
                    >
                      −0.5s
                    </button>
                    <span className="badge">
                      {subs.name} ({subs.offset >= 0 ? `+${subs.offset}` : subs.offset}s)
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => onSetSubs({ ...subs, offset: Number(((subs.offset || 0) + 0.5).toFixed(1)) })}
                    >
                      +0.5s
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => onSetSubs(null)}>
                      Quitar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
