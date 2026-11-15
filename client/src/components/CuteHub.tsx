import React from 'react';
import { IconHeart, IconSparkle, IconStar } from './KawaiiIcons';
import { ActivityId, HUB_CARDS } from './hub/hubCards';

export type { ActivityId };

interface Props {
  myName: string;
  peerName?: string;
  hasMovieLoaded: boolean;
  movieTitle?: string;
  onSelectActivity: (act: ActivityId) => void;
  onSendReaction: (emoji: string) => void;
}

export const CuteHub: React.FC<Props> = ({ hasMovieLoaded, onSelectActivity, onSendReaction }) => {
  return (
    <main className="cinema-stage cute-hub-stage">
      <div className="screen-bezel cute-hub-bezel kawaii-pastel-hub">
        <div className="kawaii-hub-inner">
          <div className="kawaii-hub-reacts">
            <button type="button" className="kawaii-react-circle pink" onClick={() => onSendReaction('♥')} aria-label="Heart">
              <IconHeart size={22} />
            </button>
            <button type="button" className="kawaii-react-circle gold" onClick={() => onSendReaction('✦')} aria-label="Sparkle">
              <IconSparkle size={22} />
            </button>
            <button type="button" className="kawaii-react-circle lavender" onClick={() => onSendReaction('★')} aria-label="Star">
              <IconStar size={22} />
            </button>
          </div>

          <div className="kawaii-cards-grid">
            {HUB_CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="kawaii-hub-card"
                style={{ background: c.pastelBg, borderColor: c.pastelBorder, color: c.iconColor }}
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
