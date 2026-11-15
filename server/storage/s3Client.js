// Cliente S3 y utilidades de configuración para Backblaze B2
import { S3Client } from '@aws-sdk/client-s3';

export const PART_SIZE = 10 * 1024 * 1024; // 10 MB
export const FREE_LIMIT = 10 * 1024 ** 3; // 10 GB gratis en B2

let client = null;

export function storageConfigured() {
  return !!(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET && process.env.B2_ENDPOINT);
}

export function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.B2_REGION || 'us-east-005',
      endpoint: process.env.B2_ENDPOINT,
      credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APP_KEY },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

export const Bucket = () => process.env.B2_BUCKET;

export const clean = (s, max = 120) =>
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
  mkv: 'video/webm',
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
