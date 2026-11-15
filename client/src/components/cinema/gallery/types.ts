import { RoomSource } from '../types';

export type GalleryCategory = 'all' | 'database' | 'cuevana' | 'youtube';

export interface GalleryMovie {
  id: string;
  title: string;
  category: 'database' | 'cuevana' | 'youtube';
  badge: string;
  year?: string;
  duration?: string;
  desc?: string;
  url?: string;
  posterUrl?: string;
  versions?: { key: string; quality: string; file: string; size: number }[];
  sourcePayload?: RoomSource;
}

export interface GalleryProps {
  onSelectSource: (src: RoomSource) => void;
  onOpenSources?: () => void;
}
