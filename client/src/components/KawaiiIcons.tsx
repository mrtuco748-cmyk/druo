import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const base = (size = 20, color = 'currentColor', className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

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
    <path
      d="M12 20.5s-7.5-4.6-7.5-10.2a4.3 4.3 0 0 1 7.5-2.8 4.3 4.3 0 0 1 7.5 2.8c0 5.6-7.5 10.2-7.5 10.2z"
      fill="currentColor"
      fillOpacity="0.22"
    />
  </svg>
);

export const IconSparkle: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path
      d="M12 3l2.2 6.2L20.5 12l-6.3 2.8L12 21l-2.2-6.2L3.5 12l6.3-2.8L12 3z"
      fill="currentColor"
      fillOpacity="0.2"
    />
  </svg>
);

export const IconStar: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polygon
      points="12 2.5 14.9 8.4 21.4 9.3 16.7 13.9 17.8 20.4 12 17.3 6.2 20.4 7.3 13.9 2.6 9.3 9.1 8.4"
      fill="currentColor"
      fillOpacity="0.22"
    />
  </svg>
);

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
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="9" cy="6" r="2.2" fill="#fff" />
    <circle cx="15" cy="12" r="2.2" fill="#fff" />
    <circle cx="10" cy="18" r="2.2" fill="#fff" />
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

/* --- Iconos del Estudio de Dibujo --- */
export const IconPen: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.5 7.5" />
  </svg>
);

export const IconMarker: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M15 4l5 5L8 21H3v-5L15 4z" />
    <path d="M12 7l5 5" />
  </svg>
);

export const IconAirbrush: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="6" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="7" cy="15" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
    <path d="M13 11l6-6 2 2-6 6-2-2z" />
    <path d="M11 13l-3 7 7-3" />
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
    <path d="M5 2l5 5" />
    <path d="M20 14c1.5 2 2 3.2 2 4.2a2 2 0 0 1-4 0c0-1 .5-2.2 2-4.2z" fill="currentColor" />
  </svg>
);

export const IconHand: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M18 11V6a1.5 1.5 0 0 0-3 0v4" />
    <path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10" />
    <path d="M12 9.5V5.5a1.5 1.5 0 0 0-3 0V12" />
    <path d="M9 11l-1.6-1.6a1.5 1.5 0 0 0-2.1 2.1l4.2 5.2A5 5 0 0 0 13.4 19H15a4 4 0 0 0 4-4v-4a1.5 1.5 0 0 0-3 0" />
  </svg>
);

export const IconResetView: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const IconLine: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="4" y1="20" x2="20" y2="4" />
    <circle cx="4" cy="20" r="2" fill="currentColor" />
    <circle cx="20" cy="4" r="2" fill="currentColor" />
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
    <path d="M14 4l6 6-2 2-6-6 2-2z" />
    <path d="M12 6L4 14v6h6l8-8" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const IconDownload: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
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

export const IconViewCinema: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="5" width="4" height="14" rx="1.5" />
    <rect x="8" y="5" width="8" height="14" rx="1.5" />
    <rect x="18" y="5" width="4" height="14" rx="1.5" />
  </svg>
);

export const IconViewCall: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="5" width="9" height="14" rx="2" />
    <rect x="13" y="5" width="9" height="14" rx="2" />
  </svg>
);

export const IconViewFocus: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="2" y="4" width="20" height="16" rx="2.5" />
    <rect x="15" y="13" width="5" height="4" rx="1" fill="currentColor" />
  </svg>
);

export const IconViewDuo: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="3" y="3" width="18" height="9" rx="2" />
    <rect x="3" y="14" width="8" height="7" rx="1.5" />
    <rect x="13" y="14" width="8" height="7" rx="1.5" />
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

export const IconPlus: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconRain: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M20 15.5A4.5 4.5 0 0 0 17.5 7a6 6 0 0 0-11.6 1A4 4 0 0 0 5 15.8" />
    <line x1="8" y1="18" x2="7" y2="21" />
    <line x1="12" y1="18" x2="11" y2="21" />
    <line x1="16" y1="18" x2="15" y2="21" />
  </svg>
);

export const IconFire: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M12 22a7 7 0 0 0 7-7c0-3.5-2.5-6.5-4-8.5-.5 2-2 3-2 3C12 6 10 3 10 3c-2.5 3.5-5 6.5-5 12a7 7 0 0 0 7 7z" />
  </svg>
);

export const IconWaves: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    <path d="M2 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
  </svg>
);

export const IconMusic: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const IconCards: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <rect x="6" y="3" width="14" height="18" rx="3" />
    <path d="M4 7v11a3 3 0 0 0 3 3h9" />
  </svg>
);

export const IconGrid: React.FC<IconProps> = ({ size, color, className }) => (
  <svg {...base(size, color, className)}>
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
  </svg>
);
