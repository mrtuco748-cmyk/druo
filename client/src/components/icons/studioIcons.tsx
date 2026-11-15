// Iconos de herramientas del estudio de dibujo
import React from 'react';
import { base, IconProps } from './base';

export const IconPen: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.5 7.5" />
  </svg>
);

export const IconMarker: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M15 4l5 5L8 21H3v-5L15 4z" /><path d="M12 7l5 5" />
  </svg>
);

export const IconAirbrush: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="6" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="15" r="1.2" fill="currentColor" stroke="none" /><circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
    <path d="M13 11l6-6 2 2-6 6-2-2z" /><path d="M11 13l-3 7 7-3" />
  </svg>
);

export const IconEraser: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.5 2.7c.8-.8 2-.8 2.8 0L21 7.4c.8.8.8 2 0 2.8L11.5 19.7" />
    <path d="M8.5 10.5l5 5" />
  </svg>
);

export const IconBucket: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M19 11L11 3 3.4 10.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11z" />
    <path d="M5 2l5 5" /><path d="M20 14c1.5 2 2 3.2 2 4.2a2 2 0 0 1-4 0c0-1 .5-2.2 2-4.2z" fill="currentColor" />
  </svg>
);

export const IconHand: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M18 11V6a1.5 1.5 0 0 0-3 0v4" /><path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10" />
    <path d="M12 9.5V5.5a1.5 1.5 0 0 0-3 0V12" /><path d="M9 11l-1.6-1.6a1.5 1.5 0 0 0-2.1 2.1l4.2 5.2A5 5 0 0 0 13.4 19H15a4 4 0 0 0 4-4v-4a1.5 1.5 0 0 0-3 0" />
  </svg>
);

export const IconResetView: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const IconLine: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="4" y1="20" x2="20" y2="4" /><circle cx="4" cy="20" r="2" fill="currentColor" /><circle cx="20" cy="4" r="2" fill="currentColor" />
  </svg>
);

export const IconRect: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="4" y="5" width="16" height="14" rx="3" />
  </svg>
);

export const IconCircle: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="12" cy="12" r="8" />
  </svg>
);

export const IconEyedropper: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M14 4l6 6-2 2-6-6 2-2z" /><path d="M12 6L4 14v6h6l8-8" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const IconDownload: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
