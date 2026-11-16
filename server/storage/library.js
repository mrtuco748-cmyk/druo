// Operaciones de biblioteca, listado y URLs de reproducción en S3/B2
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertKey, Bucket, FREE_LIMIT, s3 } from './s3Client.js';

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

export async function signedPlayUrl(key) {
  assertKey(key);
  const cmd = new GetObjectCommand({ Bucket: Bucket(), Key: key });
  return getSignedUrl(s3(), cmd, { expiresIn: 12 * 3600 });
}

export async function playUrl(key) {
  assertKey(key);
  return { url: `/api/stream?key=${encodeURIComponent(key)}` };
}

export async function deleteKeys(keys) {
  for (const k of keys) {
    assertKey(k);
    await s3().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: k }));
  }
  return { ok: true };
}
