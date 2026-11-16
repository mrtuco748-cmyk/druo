// Facade de almacenamiento en Backblaze B2 (API compatible S3)
export { PART_SIZE, FREE_LIMIT, storageConfigured, mimeFor, assertKey } from './storage/s3Client.js';
export { listLibrary, playUrl, signedPlayUrl, deleteKeys } from './storage/library.js';
export { startUpload, partUrl, listParts, completeUpload, abortUpload } from './storage/multipart.js';
