// SVG line icons (Lucide-style, original paths from Claude Design)

interface IconProps {
  size?: number;
  stroke?: number;
  color?: string;
  fill?: string;
  style?: React.CSSProperties;
}

function Icon({ size = 24, stroke = 1.75, color = 'currentColor', fill = 'none', style = {}, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke}
         strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

export function Plus(p: IconProps) { return <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>; }
export function X(p: IconProps) { return <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>; }
export function Pencil(p: IconProps) { return <Icon {...p}><path d="M14 4l6 6-11 11H3v-6L14 4z"/><path d="M13 5l6 6"/></Icon>; }
export function Check(p: IconProps) { return <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>; }
export function Trophy(p: IconProps) { return <Icon {...p}><path d="M6 4h12v4a6 6 0 01-12 0V4z"/><path d="M6 6H3v2a3 3 0 003 3"/><path d="M18 6h3v2a3 3 0 01-3 3"/><path d="M8 20h8M10 14v6M14 14v6"/></Icon>; }
export function Play(p: IconProps) { return <Icon {...p} fill="currentColor"><path d="M7 5l12 7-12 7V5z" stroke="none"/></Icon>; }
export function ArrowR(p: IconProps) { return <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>; }
export function Live({ size = 8, color = '#FF4757' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
}
