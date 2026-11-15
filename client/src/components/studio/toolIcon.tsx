import React from 'react';
import {
  IconAirbrush, IconBrush, IconBucket, IconCircle, IconEraser,
  IconEyedropper, IconHand, IconHeart, IconLine, IconMarker,
  IconPen, IconRect, IconSparkle, IconStar,
} from '../KawaiiIcons';
import { StudioTool } from './types';

export function renderActiveToolIcon(t: StudioTool, sz = 22): React.ReactNode {
  switch (t) {
    case 'pen': return <IconPen size={sz} />;
    case 'marker': return <IconMarker size={sz} />;
    case 'neon': return <IconSparkle size={sz} />;
    case 'airbrush': return <IconAirbrush size={sz} />;
    case 'bucket': return <IconBucket size={sz} />;
    case 'eraser': return <IconEraser size={sz} />;
    case 'pan': return <IconHand size={sz} />;
    case 'line': return <IconLine size={sz} />;
    case 'rect': return <IconRect size={sz} />;
    case 'circle': return <IconCircle size={sz} />;
    case 'heart': return <IconHeart size={sz} />;
    case 'star': return <IconStar size={sz} />;
    case 'eyedropper': return <IconEyedropper size={sz} />;
    default: return <IconBrush size={sz} />;
  }
}
