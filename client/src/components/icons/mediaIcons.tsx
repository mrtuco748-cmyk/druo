// Iconos de cámara, micrófono, volumen y reproducción
import React from 'react';
import { base, IconProps } from './base';

export const IconMicOn: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 10.5a7 7 0 0 0 14 0" />
    <path d="M12 17.5v4M8.5 21.5h7" />
  </svg>
);

export const IconMicOff: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M3 3l18 18" />
    <path d="M9 9v1.5a3 3 0 0 0 5.1 2.1M15 9V5.5a3 3 0 0 0-5.7-1.3" />
    <path d="M5 10.5a7 7 0 0 0 11.5 5.3M12 17.5v4M8.5 21.5h7" />
  </svg>
);

export const IconCamOn: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="M15.5 10l5-3v10l-5-3v-4z" />
  </svg>
);

export const IconCamOff: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M3 3l18 18" />
    <path d="M10.5 6H13a2.5 2.5 0 0 1 2.5 2.5v2M15.5 15.5a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 2.5 15.5v-7c0-1 .6-1.9 1.5-2.3" />
    <path d="M15.5 10l5-3v10l-3-1.8" />
  </svg>
);

export const IconSliders: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="9" cy="6" r="2.2" fill="#fff" /><circle cx="15" cy="12" r="2.2" fill="#fff" /><circle cx="10" cy="18" r="2.2" fill="#fff" />
  </svg>
);

export const IconVolume: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </svg>
);

export const IconDucking: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M2 12h3l3-7 4 14 4-10 3 6h3" />
  </svg>
);

export const IconFullscreen: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconPlay: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polygon points="6 4 20 12 6 20" fill="currentColor" />
  </svg>
);

export const IconPause: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </svg>
);

export const IconRefresh: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
  </svg>
);
