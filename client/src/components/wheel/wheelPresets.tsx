import React from 'react';
import { IconCinema, IconCoffee, IconGamepad, IconHeart } from '../KawaiiIcons';

export const PRESETS: { id: string; icon: React.ReactNode; options: string[] }[] = [
  { id: 'food', icon: <IconCoffee size={18} />, options: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Empanadas', 'Helado'] },
  { id: 'movie', icon: <IconCinema size={18} />, options: ['Romance', 'Terror', 'Comedia', 'Sci-Fi', 'Anime', 'Misterio'] },
  { id: 'game', icon: <IconGamepad size={18} />, options: ['Dibujar', 'Peli', 'Preguntas', 'Tatetí', 'Charlar', 'Música'] },
  { id: 'turn', icon: <IconHeart size={18} />, options: ['Izquierda', 'Derecha', 'Izquierda', 'Derecha'] },
];
