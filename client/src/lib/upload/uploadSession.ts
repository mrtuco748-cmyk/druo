// Gestión de sesiones de subida reanudable en localStorage
export const STORAGE_PREFIX = 'druo.upload.';

export function fingerprint(file: File, title: string, quality: string): string {
  return `${STORAGE_PREFIX}${title}|${quality}|${file.name}|${file.size}|${file.lastModified}`;
}

export async function postJson(url: string, body: any): Promise<any> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

export interface SavedUpload {
  key: string;
  uploadId: string;
  partSize: number;
}

export async function initOrResumeSession(
  file: File,
  title: string,
  quality: string,
  fp: string
): Promise<{ saved: SavedUpload; doneMap: Map<number, string> }> {
  let saved: SavedUpload | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(fp) || 'null');
  } catch {}

  let doneParts: { PartNumber: number; ETag: string; Size?: number }[] = [];

  if (saved?.key && saved?.uploadId) {
    const check = await postJson('/api/upload/parts', { key: saved.key, uploadId: saved.uploadId });
    if (Array.isArray(check.parts)) {
      doneParts = check.parts;
    } else {
      saved = null;
    }
  }

  if (!saved) {
    saved = await postJson('/api/upload/start', {
      title,
      quality,
      filename: file.name,
      type: file.type,
    });
    localStorage.setItem(fp, JSON.stringify(saved));
  }

  const doneMap = new Map<number, string>();
  for (const p of doneParts) {
    if (p.PartNumber && p.ETag) doneMap.set(p.PartNumber, p.ETag);
  }

  return { saved, doneMap };
}
