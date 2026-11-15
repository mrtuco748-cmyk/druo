// Carga multiparte de archivos a S3/B2 con soporte de reanudación
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertKey, Bucket, clean, mimeFor, PART_SIZE, s3 } from './s3Client.js';

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
    return { parts: null };
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
