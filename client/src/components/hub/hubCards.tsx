import React from 'react';
import { IconBrush, IconCinema, IconCoffee, IconGamepad, IconWheel } from '../KawaiiIcons';

export type ActivityId = 'hub' | 'cinema' | 'draw' | 'games' | 'wheel' | 'relax';

export interface HubCardDef {
  id: ActivityId;
  pastelBg: string;
  pastelBorder: string;
  iconColor: string;
  renderIcon: () => React.ReactNode;
}

export const HUB_CARDS: HubCardDef[] = [
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
