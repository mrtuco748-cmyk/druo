// Biblioteca de películas en Backblaze B2 (API compatible S3).
// Los archivos suben/bajan DIRECTO entre el navegador y B2 con URLs firmadas:
// el server de Druo nunca transporta los bytes del video.
//
// Estructura de keys:  pelis/<titulo>/<calidad>/<archivo>

import {
  S3Client,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const PART_SIZE = 10 * 1024 * 1024; // 10 MB: si se corta internet solo se repite un pedacito
export const FREE_LIMIT = 10 * 1024 ** 3; // 10 GB gratis en B2

let client = null;

export function storageConfigured() {
  return !!(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET && process.env.B2_ENDPOINT);
}

function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.B2_REGION || 'us-east-005',
      endpoint: process.env.B2_ENDPOINT,
      credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APP_KEY },
      // B2 no soporta los checksums CRC32 que el SDK nuevo agrega por defecto.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

const Bucket = () => process.env.B2_BUCKET;

const clean = (s, max = 120) =>
  String(s || '')
    .replace(/[\\/\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const MIME = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/webm', // Chrome/Android reproduce mkv (VP9/H264+AAC/Opus) si se anuncia como webm
  mp3: 'audio/mpeg',
};

export function mimeFor(filename, fallback) {
  const ext = String(filename).split('.').pop().toLowerCase();
  return MIME[ext] || fallback || 'application/octet-stream';
}

export function assertKey(key) {
  if (typeof key !== 'string' || !key.startsWith('pelis/') || key.includes('..')) {
    const e = new Error('key inválida');
    e.status = 400;
    throw e;
  }
  return key;
}

export async function listLibrary() {
  const items = [];
  let ContinuationToken;
  do {
    const r = await s3().send(new ListObjectsV2Command({ Bucket: Bucket(), Prefix: 'pelis/', ContinuationToken }));
    for (const o of r.Contents || []) items.push(o);
    ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (ContinuationToken);

  const titles = new Map();
  let used = 0;
  for (const o of items) {
    const [, title, quality, ...rest] = o.Key.split('/');
    if (!title || !quality || !rest.length) continue;
    used += o.Size || 0;
    if (!titles.has(title)) titles.set(title, { title, versions: [], updatedAt: 0 });
    const t = titles.get(title);
    t.versions.push({ key: o.Key, quality, file: rest.join('/'), size: o.Size });
    t.updatedAt = Math.max(t.updatedAt, new Date(o.LastModified).getTime());
  }
  const qn = (q) => parseInt(q, 10) || 0;
  const list = [...titles.values()]
    .map((t) => ({ ...t, versions: t.versions.sort((a, b) => qn(b.quality) - qn(a.quality)) }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { titles: list, used, limit: FREE_LIMIT };
}

export async function startUpload({ title, quality, filename, type }) {
  const t = clean(title) || 'Sin título';
  const q = clean(quality, 20) || 'original';
  const f = clean(filename, 160) || 'video.mp4';
  const Key = `pelis/${t}/${q}/${f}`;
  const r = await s3().send(
    new CreateMultipartUploadCommand({ Bucket: Bucket(), Key, ContentType: mimeFor(f, type) })
  );
  return { key: Key, uploadId: r.UploadId, partSize: PART_SIZE };
}

export async function partUrl({ key, uploadId, partNumber }) {
  assertKey(key);
  const cmd = new UploadPartCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumber: Number(partNumber) });
  return { url: await getSignedUrl(s3(), cmd, { expiresIn: 3600 }) };
}

export async function listParts({ key, uploadId }) {
  assertKey(key);
  const parts = [];
  let PartNumberMarker;
  try {
    do {
      const r = await s3().send(new ListPartsCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumberMarker }));
      for (const p of r.Parts || []) parts.push({ PartNumber: p.PartNumber, ETag: p.ETag, Size: p.Size });
      PartNumberMarker = r.IsTruncated ? r.NextPartNumberMarker : undefined;
    } while (PartNumberMarker);
  } catch (e) {
    return { parts: null }; // la subida ya no existe → empezar de nuevo
  }
  return { parts };
}

export async function completeUpload({ key, uploadId, parts }) {
  assertKey(key);
  const Parts = (parts || [])
    .map((p) => ({ PartNumber: Number(p.PartNumber), ETag: String(p.ETag) }))
    .sort((a, b) => a.PartNumber - b.PartNumber);
  await s3().send(
    new CompleteMultipartUploadCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId, MultipartUpload: { Parts } })
  );
  return { ok: true, key };
}

export async function abortUpload({ key, uploadId }) {
  assertKey(key);
  await s3().send(new AbortMultipartUploadCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId }));
  return { ok: true };
}

export async function playUrl(key) {
  assertKey(key);
  const cmd = new GetObjectCommand({ Bucket: Bucket(), Key: key });
  return { url: await getSignedUrl(s3(), cmd, { expiresIn: 12 * 3600 }) };
}

export async function deleteKeys(keys) {
  for (const k of keys) {
    assertKey(k);
    await s3().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: k }));
  }
  return { ok: true };
}
