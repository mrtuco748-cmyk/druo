export const LIKELY_QUESTIONS = [
  '¿Quién es más probable que se quede dormido a los 15 minutos de empezar la película?',
  '¿Quién es más probable que robe comida del plato del otro diciendo "solo quiero probar"?',
  '¿Quién es más probable que pida mimos primero después de un día largo?',
  '¿Quién es más probable que tarde 40 minutos eligiendo qué ver y termine poniendo lo de siempre?',
  '¿Quién es más probable que se ría en un momento serio?',
  '¿Quién es más probable que mande 10 videos seguidos a las 2 de la mañana?',
  '¿Quién es más probable que se emocione con el final de una película tierna?',
  '¿Quién es más probable que se pierda incluso usando el mapa?',
  '¿Quién es más probable que adopte una mascota sin avisar?',
  '¿Quién es más probable que diga "5 minutitos más" cuando suena la alarma?',
  '¿Quién es más probable que planee una salida sorpresa de fin de semana?',
  '¿Quién es más probable que se coma el último pedazo de postre?',
];

export const CARDS_DECK: Record<'sweet' | 'deep' | 'spicy', string[]> = {
  sweet: [
    '¿Cuál fue el primer pensamiento que tuviste la primera vez que hablamos o nos vimos?',
    '¿Qué pequeño gesto mío te hace sonreír automáticamente en el día a día?',
    'Si pudiéramos teletransportarnos ahora mismo a cualquier lugar juntos, ¿adónde iríamos?',
    '¿Cuál es tu recuerdo favorito de nosotros dos hasta ahora?',
    '¿Qué canción o película te hace acordar a mí siempre?',
    '¿Cómo describirías nuestra conexión en tres palabras?',
  ],
  deep: [
    '¿Qué es algo que aprendiste sobre vos mismo/a desde que estamos juntos?',
    '¿Cuál es un sueño o meta que te encantaría que cumplamos juntos en el futuro?',
    '¿En qué momento sentiste más paz estando conmigo?',
    '¿Qué valorás más de la forma en que nos cuidamos?',
    'Si pudieras congelar un momento nuestro para revivirlo siempre, ¿cuál elegirías?',
  ],
  spicy: [
    '¿Qué parte mía te vuelve más loco/a cuando nos vemos?',
    '¿Cuál sería tu cita nocturna ideal sin interrupciones?',
    '¿Qué fue lo más atrevido que pensaste la última vez que estuvimos juntos?',
    'Confesá algo que te den muchas ganas de hacer la próxima vez que nos veamos.',
    '¿Cuál es tu lugar o momento favorito para darnos besos?',
  ],
};

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function checkWinner(board: ('left' | 'right' | null)[]): 'left' | 'right' | 'draw' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}
