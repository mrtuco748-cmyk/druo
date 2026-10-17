import React from 'react';
import {
  IconBrush,
  IconCinema,
  IconCoffee,
  IconGamepad,
  IconHeart,
  IconSparkle,
  IconStar,
  IconWheel,
} from './KawaiiIcons';

export type ActivityId = 'hub' | 'cinema' | 'draw' | 'games' | 'wheel' | 'relax';

interface Props {
  myName: string;
  peerName?: string;
  hasMovieLoaded: boolean;
  movieTitle?: string;
  onSelectActivity: (act: ActivityId) => void;
  onSendReaction: (emoji: string) => void;
}

const CARDS: {
  id: ActivityId;
  pastelBg: string;
  pastelBorder: string;
  iconColor: string;
  renderIcon: () => React.ReactNode;
}[] = [
  {
    id: 'cinema',
    pastelBg: 'linear-gradient(145deg, #ffe3ee 0%, #ffd1e3 100%)',
    pastelBorder: '#ffb3cf',
    iconColor: '#e85d88',
    renderIcon: () => <IconCinema size={44} />,
  },
  {
    id: 'draw',
    pastelBg: 'linear-gradient(145deg, #fff3d6 0%, #ffe4ad 100%)',
    pastelBorder: '#ffd07b',
    iconColor: '#d9822b',
    renderIcon: () => <IconBrush size={44} />,
  },
  {
    id: 'games',
    pastelBg: 'linear-gradient(145deg, #ede2ff 0%, #decaff 100%)',
    pastelBorder: '#c5a3ff',
    iconColor: '#7c52cc',
    renderIcon: () => <IconGamepad size={44} />,
  },
  {
    id: 'wheel',
    pastelBg: 'linear-gradient(145deg, #dbf7ec 0%, #c1f0de 100%)',
    pastelBorder: '#96e3c6',
    iconColor: '#2f9e77',
    renderIcon: () => <IconWheel size={44} />,
  },
  {
    id: 'relax',
    pastelBg: 'linear-gradient(145deg, #dff0ff 0%, #c7e4ff 100%)',
    pastelBorder: '#9ecfff',
    iconColor: '#3b82c4',
    renderIcon: () => <IconCoffee size={44} />,
  },
];

export const CuteHub: React.FC<Props> = ({
  hasMovieLoaded,
  onSelectActivity,
  onSendReaction,
}) => {
  return (
    <main className="cinema-stage cute-hub-stage">
      <div className="screen-bezel cute-hub-bezel kawaii-pastel-hub">
        <div className="kawaii-hub-inner">
          {/* Fila superior minimalista de reacciones con solo iconos SVG */}
          <div className="kawaii-hub-reacts">
            <button
              type="button"
              className="kawaii-react-circle pink"
              onClick={() => onSendReaction('♥')}
              aria-label="Heart"
            >
              <IconHeart size={22} />
            </button>
            <button
              type="button"
              className="kawaii-react-circle gold"
              onClick={() => onSendReaction('✦')}
              aria-label="Sparkle"
            >
              <IconSparkle size={22} />
            </button>
            <button
              type="button"
              className="kawaii-react-circle lavender"
              onClick={() => onSendReaction('★')}
              aria-label="Star"
            >
              <IconStar size={22} />
            </button>
          </div>

          {/* Grilla limpia de tarjetas Pastel Kawaii (Solo Iconos, Sin Textos, Sin Emojis) */}
          <div className="kawaii-cards-grid">
            {CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="kawaii-hub-card"
                style={
                  {
                    background: c.pastelBg,
                    borderColor: c.pastelBorder,
                    color: c.iconColor,
                  } as React.CSSProperties
                }
                onClick={() => onSelectActivity(c.id)}
                aria-label={c.id}
              >
                <div className="kawaii-card-icon-wrap">{c.renderIcon()}</div>
                {c.id === 'cinema' && hasMovieLoaded && <span className="kawaii-active-dot" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
