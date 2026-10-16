// Subida multiparte directa del navegador a Backblaze B2 con reanudación automática:
// si se corta el internet a mitad de una película de 1.5 GB, retoma desde el último bloque de 10 MB.

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  pct: number;
  partNumber: number;
  totalParts: number;
}

const STORAGE_PREFIX = 'druo.upload.';

function fingerprint(file: File, title: string, quality: string) {
  return `${STORAGE_PREFIX}${title}|${quality}|${file.name}|${file.size}|${file.lastModified}`;
}

async function postJson(url: string, body: any) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

export async function uploadMovieToB2(
  file: File,
  title: string,
  quality: string,
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal
): Promise<{ key: string }> {
  const fp = fingerprint(file, title, quality);
  let saved: { key: string; uploadId: string; partSize: number } | null = null;
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

  const { key, uploadId, partSize } = saved!;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));
  const doneMap = new Map<number, string>();
  for (const p of doneParts) {
    if (p.PartNumber && p.ETag) doneMap.set(p.PartNumber, p.ETag);
  }

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (signal?.aborted) throw new Error('Subida cancelada');
    const start = (partNumber - 1) * partSize;
    const end = Math.min(file.size, start + partSize);

    if (doneMap.has(partNumber)) {
      onProgress({
        uploadedBytes: end,
        totalBytes: file.size,
        pct: Math.round((end / file.size) * 100),
        partNumber,
        totalParts,
      });
      continue;
    }

    const blob = file.slice(start, end);
    let etag: string | null = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      if (signal?.aborted) throw new Error('Subida cancelada');
      try {
        const { url } = await postJson('/api/upload/part-url', { key, uploadId, partNumber });
        const put = await fetch(url, { method: 'PUT', body: blob, signal });
        if (!put.ok) throw new Error(`PUT parte ${partNumber} devolvió ${put.status}`);
        etag = put.headers.get('ETag') || put.headers.get('etag');
        if (!etag) {
          // Si CORS no expuso ETag, lo consultamos al servidor vía S3 ListParts
          const listed = await postJson('/api/upload/parts', { key, uploadId });
          const found = (listed.parts || []).find((x: any) => x.PartNumber === partNumber);
          etag = found?.ETag || null;
        }
        if (!etag) throw new Error('No se pudo verificar el bloque subido (ETag)');
        break;
      } catch (e) {
        if (attempt === 4 || signal?.aborted) throw e;
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }

    doneMap.set(partNumber, etag!);
    onProgress({
      uploadedBytes: end,
      totalBytes: file.size,
      pct: Math.round((end / file.size) * 100),
      partNumber,
      totalParts,
    });
  }

  const parts = [...doneMap.entries()].map(([PartNumber, ETag]) => ({ PartNumber, ETag }));
  await postJson('/api/upload/complete', { key, uploadId, parts });
  localStorage.removeItem(fp);
  return { key };
}
