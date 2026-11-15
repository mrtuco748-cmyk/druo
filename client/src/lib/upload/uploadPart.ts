// Subida de un bloque individual a S3/B2 con reintentos exponenciales
import { postJson } from './uploadSession';

export async function uploadSinglePart(
  blob: Blob,
  key: string,
  uploadId: string,
  partNumber: number,
  signal?: AbortSignal
): Promise<string> {
  let etag: string | null = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    if (signal?.aborted) throw new Error('Subida cancelada');
    try {
      const { url } = await postJson('/api/upload/part-url', { key, uploadId, partNumber });
      const put = await fetch(url, { method: 'PUT', body: blob, signal });
      if (!put.ok) throw new Error(`PUT parte ${partNumber} devolvió ${put.status}`);
      etag = put.headers.get('ETag') || put.headers.get('etag');

      if (!etag) {
        // Fallback a ListParts si CORS enmascaró el ETag
        const listed = await postJson('/api/upload/parts', { key, uploadId });
        const found = (listed.parts || []).find((x: any) => x.PartNumber === partNumber);
        etag = found?.ETag || null;
      }

      if (!etag) throw new Error('No se pudo verificar el bloque subido (ETag)');
      return etag;
    } catch (e) {
      if (attempt === 4 || signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }

  throw new Error(`Fallo definitivo subiendo parte ${partNumber}`);
}
