import React from 'react';

export const IconPlayPause: React.FC<{ playing: boolean }> = ({ playing }) =>
  playing ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M7 5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-3 0v-11A1.5 1.5 0 0 1 7 5zm10 0a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-3 0v-11A1.5 1.5 0 0 1 17 5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.1-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  );

export const IconSeek10: React.FC<{ dir: 'back' | 'fwd' }> = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'back' ? <path d="M4 12a8 8 0 0 1 14.93-3.93M4 12V7m0 5H9" /> : <path d="M20 12a8 8 0 0 0-14.93-3.93M20 12V7m0 5h-5" />}
    <text x="12" y="15" fontSize="7.5" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">10</text>
  </svg>
);

export const IconPlaylistNav: React.FC<{ dir: 'prev' | 'next' }> = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    {dir === 'prev' ? <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /> : <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />}
  </svg>
);

export const IconCinemaVolume: React.FC<{ volume: number }> = ({ volume }) =>
  volume === 0 ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : volume < 0.5 ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );

export const IconCinemaFullscreen: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14h6m0 0v6m0-6L3 21m17-11h-6m0 0V4m0 6l7-7M14 14h6m-6 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
