// Iconos generales de navegación y actividades
import React from 'react';
import { base, IconProps } from './base';

export const IconHome: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5" />
    <path d="M12 16.5s-2.5-1.6-2.5-3.1a1.4 1.4 0 0 1 2.5-.8 1.4 1.4 0 0 1 2.5.8c0 1.5-2.5 3.1-2.5 3.1z" />
  </svg>
);

export const IconCinema: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" />
    <path d="M2.5 9h19" />
    <path d="M7 4.5l2 4.5M14 4.5l2 4.5" />
    <polygon points="10 12 15 14.5 10 17" fill="currentColor" stroke="none" />
  </svg>
);

export const IconBrush: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M18.4 3.6a2.4 2.4 0 0 1 3.4 3.4L12 16.8 8 18l1.2-4 9.2-10.4z" />
    <path d="M5.5 16.5c-1.5 1-2 3.5-3 4.5 2.5 0 4.5-.5 5.5-2" />
  </svg>
);

export const IconGamepad: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="6" width="20" height="12" rx="6" />
    <path d="M6 12h4M8 10v4" />
    <circle cx="15.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18" cy="13" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWheel: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M18.4 5.6l-5 5M10.6 13.4l-5 5" />
  </svg>
);

export const IconCoffee: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M17 8h1a3.5 3.5 0 0 1 0 7h-1" />
    <path d="M3 8h14v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V8z" />
    <path d="M7 3v2M10 3v2M13 3v2" />
  </svg>
);

export const IconHeart: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.2a4.3 4.3 0 0 1 7.5-2.8 4.3 4.3 0 0 1 7.5 2.8c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor" fillOpacity="0.22" />
  </svg>
);

export const IconSparkle: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 3l2.2 6.2L20.5 12l-6.3 2.8L12 21l-2.2-6.2L3.5 12l6.3-2.8L12 3z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const IconStar: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polygon points="12 2.5 14.9 8.4 21.4 9.3 16.7 13.9 17.8 20.4 12 17.3 6.2 20.4 7.3 13.9 2.6 9.3 9.1 8.4" fill="currentColor" fillOpacity="0.22" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconChevronLeft: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconPlus: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
