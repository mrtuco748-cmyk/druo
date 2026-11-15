import { useEffect, useMemo, useState } from 'react';
import { RoomSource } from '../types';
import { CUEVANA_CATALOG, YOUTUBE_CATALOG } from './catalogPresets';
import { GalleryCategory, GalleryMovie } from './types';

export function useCinemaGallery(onSelectSource: (src: RoomSource) => void) {
  const [cat, setCat] = useState<GalleryCategory>('all');
  const [search, setSearch] = useState('');
  const [dbMovies, setDbMovies] = useState<GalleryMovie[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLibrary = () => {
    setLoadingDb(true);
    fetch('/api/library')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.titles)) {
          const list: GalleryMovie[] = j.titles.map((t: any) => ({
            id: `db-${t.title}`,
            title: t.title,
            category: 'database' as const,
            badge: `Nube · ${t.versions.map((v: any) => v.quality).join('/') || 'HD'}`,
            desc: `${t.versions.length} calidad(es) guardada(s) en Backblaze B2.`,
            versions: t.versions,
            posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
          }));
          setDbMovies(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDb(false));
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const allMovies = useMemo(() => [...dbMovies, ...CUEVANA_CATALOG, ...YOUTUBE_CATALOG], [dbMovies]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMovies.filter((m) => {
      const matchCat = cat === 'all' || m.category === cat;
      const matchQ = !q || m.title.toLowerCase().includes(q) || m.desc?.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [allMovies, cat, search]);

  const resolveAndSelect = async (url: string, id: string) => {
    setErrorMsg(null);
    setResolvingId(id);
    try {
      const r = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo resolver el enlace.');
      onSelectSource(j);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con la fuente.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleSelectMovie = (m: GalleryMovie) => {
    if (m.category === 'database' && m.versions) {
      onSelectSource({ kind: 'library', title: m.title, versions: m.versions });
      return;
    }
    if (m.url) resolveAndSelect(m.url, m.id);
  };

  const handleCustomLinkSubmit = (url: string) => {
    if (url.trim()) resolveAndSelect(url, 'custom-link');
  };

  return {
    cat, setCat, search, setSearch, dbMovies, loadingDb,
    resolvingId, errorMsg, filteredMovies, handleSelectMovie, handleCustomLinkSubmit,
  };
}
