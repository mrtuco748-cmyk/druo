import React from 'react';

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
  emoji: string;
  badge: string;
  title: string;
  desc: string;
  accent: string;
  bgGlow: string;
}[] = [
  {
    id: 'cinema',
    emoji: '🍿',
    badge: '1 · Cita de Pelis',
    title: 'Sala de Cine',
    desc: 'Miren películas de Cuevana, YouTube o archivos juntos con audio inteligente que baja cuando hablan.',
    accent: '#ff7eb3',
    bgGlow: 'radial-gradient(circle at 80% 20%, rgba(255, 126, 179, 0.24), transparent 65%)',
  },
  {
    id: 'draw',
    emoji: '🎨',
    badge: '2 · Estudio en Vivo',
    title: 'Pizarra & Dibujo Pro',
    desc: 'Lienzo profesional compartido en tiempo real: pinceles suaves, neón, relleno, formas, stickers y Pictionary.',
    accent: '#ffcf6b',
    bgGlow: 'radial-gradient(circle at 80% 20%, rgba(255, 207, 107, 0.24), transparent 65%)',
  },
  {
    id: 'games',
    emoji: '🎲',
    badge: '3 · Para Dos',
    title: 'Noche de Juegos',
    desc: 'Jueguen a "¿Quién es más probable?", saquen Cartas de Conexión (tiernas o picantes) o compitan al Tatetí.',
    accent: '#a98bff',
    bgGlow: 'radial-gradient(circle at 80% 20%, rgba(169, 139, 255, 0.24), transparent 65%)',
  },
  {
    id: 'wheel',
    emoji: '🎡',
    badge: '4 · Sin Indecisiones',
    title: 'Ruleta de Decisiones',
    desc: '¿No saben qué pedir de cenar, qué género ver o qué hacer? Armen las opciones y giren la ruleta en vivo.',
    accent: '#63e6be',
    bgGlow: 'radial-gradient(circle at 80% 20%, rgba(99, 230, 190, 0.24), transparent 65%)',
  },
  {
    id: 'relax',
    emoji: '☕',
    badge: '7 · Cozy & Lofi',
    title: 'Rincón Relax & Compañía',
    desc: 'Sonidos relajantes (lluvia, fogata, olas) y reloj compartido para estudiar, leer o charlar antes de dormir.',
    accent: '#74c0fc',
    bgGlow: 'radial-gradient(circle at 80% 20%, rgba(116, 192, 252, 0.24), transparent 65%)',
  },
];

export const CuteHub: React.FC<Props> = ({
  myName,
  peerName,
  hasMovieLoaded,
  movieTitle,
  onSelectActivity,
  onSendReaction,
}) => {
  return (
    <main className="cinema-stage cute-hub-stage">
      <div className="screen-bezel cute-hub-bezel">
        <div className="cute-hub-scroll">
          {/* Encabezado Cute de Bienvenida */}
          <div className="cute-hub-hero">
            <div className="cute-couple-pill">
              <span>💖 {myName}</span>
              <span className="cute-heart-beat">✦</span>
              <span>{peerName ? `💖 ${peerName}` : '⏳ Esperando a tu personita…'}</span>
            </div>
            <h1 className="cute-hub-title">✨ Nuestro Rincón Secreto ✨</h1>
            <p className="cute-hub-subtitle">
              Elijan qué quieren hacer hoy juntos — al tocar una tarjeta nos lleva a los dos en tiempo real 💕
            </p>

            {/* Barra de cariñitos rápidos */}
            <div className="cute-quick-love">
              <span className="cute-love-label">Mandar cariñito:</span>
              {['💖', '🥰', '😘', '🌸', '✨', '🍓', '🫂'].map((em) => (
                <button
                  key={em}
                  type="button"
                  className="cute-love-btn"
                  onClick={() => onSendReaction(em)}
                  title={`Mandar ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas de Actividades */}
          <div className="cute-cards-grid">
            {CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cute-activity-card"
                style={{
                  '--card-accent': c.accent,
                  backgroundImage: c.bgGlow,
                } as React.CSSProperties}
                onClick={() => onSelectActivity(c.id)}
              >
                <div className="cute-card-top">
                  <span className="cute-card-icon">{c.emoji}</span>
                  <span className="cute-card-badge">{c.badge}</span>
                </div>
                <h3 className="cute-card-title">{c.title}</h3>
                <p className="cute-card-desc">{c.desc}</p>
                {c.id === 'cinema' && hasMovieLoaded && movieTitle && (
                  <div className="cute-card-now-playing">
                    🎞️ En cartelera: <strong>{movieTitle}</strong>
                  </div>
                )}
                <div className="cute-card-cta">
                  <span>Entrar juntos</span>
                  <span className="cute-card-arrow">➜</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
