import React from 'react';
import { RoomSubs } from '../CinemaScreen';

interface Props {
  subs: RoomSubs | null;
  onSelectLocalFile: (file: File, announce: boolean) => void;
  onSetSubs: (subs: RoomSubs | null) => void;
  onClose: () => void;
}

export const LocalTab: React.FC<Props> = ({ subs, onSelectLocalFile, onSetSubs, onClose }) => {
  return (
    <div className="modal-body">
      <div className="upload-box">
        <strong>Modo cero internet (archivo en cada dispositivo)</strong>
        <p className="hint-text">
          Si los dos tienen el archivo en su compu/celu (por ejemplo pasado por WhatsApp o Telegram), elegilo acá:
          la película se ve en calidad máxima sin gastar un solo mega de internet y Druo sincroniza las pausas y saltos.
        </p>
        <label className="cta-primary file-label">
          📂 Abrir archivo de video local
          <input
            type="file"
            accept="video/*,.mkv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { onSelectLocalFile(f, true); onClose(); }
            }}
          />
        </label>
      </div>

      <div className="upload-box">
        <strong>Subtítulos compartidos (.srt o .vtt)</strong>
        <p className="hint-text">Si cargás un archivo de subtítulos, se les muestra a los dos automáticamente.</p>
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
              <span className="badge">{subs.name} ({subs.offset >= 0 ? `+${subs.offset}` : subs.offset}s)</span>
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
  );
};
