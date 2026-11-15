// Propiedades comunes y base SVG para iconos Kawaii
export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const base = (size = 20, color = 'currentColor', className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});
