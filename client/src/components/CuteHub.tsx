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
    pastelBg: 'linear-gradient(145deg, #3d1b2e 0%, #29111f 100%)',
    pastelBorder: '#b84d74',
    iconColor: '#ff9ebb',
    renderIcon: () => <IconCinema size={44} />,
  },
  {
    id: 'draw',
    pastelBg: 'linear-gradient(145deg, #3b2621 0%, #281915 100%)',
    pastelBorder: '#b87b56',
    iconColor: '#ffc988',
    renderIcon: () => <IconBrush size={44} />,
  },
  {
    id: 'games',
    pastelBg: 'linear-gradient(145deg, #2e1d3d 0%, #1f132b 100%)',
    pastelBorder: '#8859b8',
    iconColor: '#cfb0ff',
    renderIcon: () => <IconGamepad size={44} />,
  },
  {
    id: 'wheel',
    pastelBg: 'linear-gradient(145deg, #1b332b 0%, #12241e 100%)',
    pastelBorder: '#479c7d',
    iconColor: '#8ce9c5',
    renderIcon: () => <IconWheel size={44} />,
  },
  {
    id: 'relax',
    pastelBg: 'linear-gradient(145deg, #1f293d 0%, #141c2b 100%)',
    pastelBorder: '#557eb8',
    iconColor: '#a3ccff',
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
