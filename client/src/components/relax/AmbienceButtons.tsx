import React from 'react';
import { IconFire, IconMicOff, IconMusic, IconRain, IconWaves } from '../KawaiiIcons';
import { AmbienceId } from './types';

interface Props {
  ambience: AmbienceId;
  onSelectAmbience: (id: AmbienceId) => void;
}

const AMBIENCES: { id: AmbienceId; icon: React.ReactNode; color: string }[] = [
  { id: 'off', icon: <IconMicOff size={24} />, color: '#361c38' },
  { id: 'rain', icon: <IconRain size={24} />, color: '#1d2d42' },
  { id: 'fire', icon: <IconFire size={24} />, color: '#3d251e' },
  { id: 'waves', icon: <IconWaves size={24} />, color: '#18362e' },
  { id: 'lofi', icon: <IconMusic size={24} />, color: '#3d1b2e' },
];

export const AmbienceButtons: React.FC<Props> = ({ ambience, onSelectAmbience }) => {
  return (
    <div className="kawaii-ambience-row">
      {AMBIENCES.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`kawaii-amb-circle ${ambience === a.id ? 'active' : ''}`}
          style={{ '--amb-bg': a.color } as React.CSSProperties}
          onClick={() => onSelectAmbience(a.id)}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
};
