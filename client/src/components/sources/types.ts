import { MovieVersion } from '../CinemaScreen';

export interface LibraryTitle {
  title: string;
  versions: MovieVersion[];
  updatedAt: number;
}

export function fmtSize(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}
