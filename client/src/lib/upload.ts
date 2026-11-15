// Subida multiparte reanudable a B2
import { uploadSinglePart } from './upload/uploadPart';
import { fingerprint, initOrResumeSession, postJson } from './upload/uploadSession';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  pct: number;
  partNumber: number;
  totalParts: number;
}

export async function uploadMovieToB2(
  file: File,
  title: string,
  quality: string,
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal
): Promise<{ key: string }> {
  const fp = fingerprint(file, title, quality);
  const { saved, doneMap } = await initOrResumeSession(file, title, quality, fp);
  const { key, uploadId, partSize } = saved;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

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
    const etag = await uploadSinglePart(blob, key, uploadId, partNumber, signal);
    doneMap.set(partNumber, etag);

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
