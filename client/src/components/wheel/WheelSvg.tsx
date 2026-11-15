import React from 'react';
import { SLICE_COLORS } from './types';

interface Props {
  options: string[];
  rotation: number;
}

export const WheelSvg: React.FC<Props> = ({ options, rotation }) => {
  const count = options.length;
  const sliceAngle = 360 / count;

  return (
    <div className="wheel-spinner-box">
      <div className="wheel-pointer">▼</div>
      <svg
        viewBox="-110 -110 220 220"
        className="wheel-svg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 3.2s cubic-bezier(0.14, 0.85, 0.22, 1)',
        }}
      >
        {options.map((opt, i) => {
          const startDeg = i * sliceAngle - 90;
          const endDeg = (i + 1) * sliceAngle - 90;
          const startRad = (startDeg * Math.PI) / 180;
          const endRad = (endDeg * Math.PI) / 180;
          const r = 102;
          const x1 = r * Math.cos(startRad);
          const y1 = r * Math.sin(startRad);
          const x2 = r * Math.cos(endRad);
          const y2 = r * Math.sin(endRad);
          const largeArc = sliceAngle > 180 ? 1 : 0;
          const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const midDeg = startDeg + sliceAngle / 2;

          return (
            <g key={i}>
              <path d={d} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#381929" strokeWidth="2.5" />
              <text
                x="56"
                y="0"
                fill="#fde8f1"
                fontSize="8.5"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${midDeg})`}
              >
                {opt.length > 14 ? `${opt.slice(0, 13)}…` : opt}
              </text>
            </g>
          );
        })}
        <circle cx="0" cy="0" r="18" fill="#2b1220" stroke="#ff85a2" strokeWidth="3" />
      </svg>
    </div>
  );
};
