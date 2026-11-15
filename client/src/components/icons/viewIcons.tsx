// Iconos de modos de vista, relax y fondos de lienzo
import React from 'react';
import { base, IconProps } from './base';

export const IconViewCinema: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="5" width="4" height="14" rx="1.5" /><rect x="8" y="5" width="8" height="14" rx="1.5" /><rect x="18" y="5" width="4" height="14" rx="1.5" />
  </svg>
);

export const IconViewCall: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="5" width="9" height="14" rx="2" /><rect x="13" y="5" width="9" height="14" rx="2" />
  </svg>
);

export const IconViewFocus: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="4" width="20" height="16" rx="2.5" /><rect x="15" y="13" width="5" height="4" rx="1" fill="currentColor" />
  </svg>
);

export const IconViewDuo: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="3" y="3" width="18" height="9" rx="2" /><rect x="3" y="14" width="8" height="7" rx="1.5" /><rect x="13" y="14" width="8" height="7" rx="1.5" />
  </svg>
);

export const IconRain: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M20 15.5A4.5 4.5 0 0 0 17.5 7a6 6 0 0 0-11.6 1A4 4 0 0 0 5 15.8" />
    <line x1="8" y1="18" x2="7" y2="21" /><line x1="12" y1="18" x2="11" y2="21" /><line x1="16" y1="18" x2="15" y2="21" />
  </svg>
);

export const IconFire: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 22a7 7 0 0 0 7-7c0-3.5-2.5-6.5-4-8.5-.5 2-2 3-2 3C12 6 10 3 10 3c-2.5 3.5-5 6.5-5 12a7 7 0 0 0 7 7z" />
  </svg>
);

export const IconWaves: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
  </svg>
);

export const IconMusic: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);

export const IconCards: React.FC<IconProps> = ({ size = 22, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M8.5 4.2L4.2 5.6a2.2 2.2 0 0 0-1.4 2.7l3.2 10.5a2.2 2.2 0 0 0 2.7 1.4l1.3-.4" opacity="0.75" />
    <rect x="8.5" y="3" width="12.5" height="17.5" rx="2.6" fill="currentColor" fillOpacity="0.16" />
    <path d="M14.75 14.3s-3.1-2-3.1-4.2a1.75 1.75 0 0 1 3.1-1.1 1.75 1.75 0 0 1 3.1 1.1c0 2.2-3.1 4.2-3.1 4.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconGrid: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);

export const IconCanvasBg: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="3" y="4" width="18" height="16" rx="3" fill="currentColor" fillOpacity="0.18" />
    <path d="M3 15l4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16" /><path d="M13.5 14.5l2-2a1.5 1.5 0 0 1 2.1 0L21 16" />
    <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
