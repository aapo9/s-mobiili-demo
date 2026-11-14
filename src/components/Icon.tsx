import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'arrow'
  | 'chevron'
  | 'chat'
  | 'lock'
  | 'info'
  | 'about'
  | 'logout'
  | 'plus'
  | 'minus'
  | 'transfer'
  | 'pin'
  | 'bookmark'
  | 'home'
  | 'card'
  | 'coins'
  | 'wallet'
  | 'user'
  | 'check'
  | 'cart'
  | 'shield'
  | 'sparkle'
  | 'list';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number; filled?: boolean };

/** Icons traced from the S-mobiili mockups (24×24 stroke icons). */
export function Icon({ name, size = 24, color = '#1E1E1E', strokeWidth = 2, filled }: Props) {
  const p = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  let body: React.ReactNode;
  switch (name) {
    case 'back':
      body = <Path d="M15 5l-7 7 7 7" {...p} />;
      break;
    case 'arrow':
      body = <Path d="M5 12h14M13 6l6 6-6 6" {...p} />;
      break;
    case 'chevron':
      body = <Path d="M9 5l7 7-7 7" {...p} />;
      break;
    case 'chat':
      body = <Path d="M4 5h16v11H9l-5 4z" {...p} />;
      break;
    case 'lock':
      body = (
        <>
          <Rect x={5} y={11} width={14} height={10} rx={2} {...p} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
        </>
      );
      break;
    case 'info':
      body = (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7v6M12 16.5v.01" {...p} />
        </>
      );
      break;
    case 'about':
      // "i" in a circle: neutral "more info", unlike the "!" of `info`.
      body = (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5.5M12 7.5v.01" {...p} />
        </>
      );
      break;
    case 'logout':
      body = <Path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" {...p} />;
      break;
    case 'plus':
      body = <Path d="M12 5v14M5 12h14" {...p} />;
      break;
    case 'minus':
      body = <Path d="M5 12h14" {...p} />;
      break;
    case 'transfer':
      body = <Path d="M5 8h13l-3-3M19 16H6l3 3" {...p} />;
      break;
    case 'pin':
      body = (
        <>
          <Path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" {...p} />
          <Circle cx={12} cy={11} r={2} {...p} />
        </>
      );
      break;
    case 'bookmark':
      body = <Path d="M7 4h10v16l-5-4-5 4z" {...p} />;
      break;
    case 'home':
      body = filled ? (
        <Path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z" fill={color} />
      ) : (
        <Path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z" {...p} />
      );
      break;
    case 'card':
      body = (
        <>
          <Rect x={3} y={5.5} width={18} height={13} rx={2.5} {...p} fill={filled ? color : 'none'} />
          <Path d="M3 10h18M7 15h4" {...p} stroke={filled ? '#FFFFFF' : color} />
        </>
      );
      break;
    case 'coins':
      body = (
        <>
          <Ellipse cx={12} cy={6.5} rx={7} ry={2.8} {...p} fill={filled ? color : 'none'} />
          <Path d="M5 6.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5M5 11.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" {...p} />
        </>
      );
      break;
    case 'wallet':
      body = <Path d="M4 7.5h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18zM4 7.5 15.5 4.5v3M15 13.5h2.5" {...p} fill={filled ? color : 'none'} />;
      break;
    case 'user':
      body = (
        <>
          <Circle cx={12} cy={8} r={3.6} {...p} fill={filled ? color : 'none'} />
          <Path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" {...p} fill={filled ? color : 'none'} />
        </>
      );
      break;
    case 'check':
      body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />;
      break;
    case 'cart':
      body = (
        <>
          <Path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" {...p} />
          <Circle cx={9.5} cy={19} r={1.4} {...p} />
          <Circle cx={17} cy={19} r={1.4} {...p} />
        </>
      );
      break;
    case 'shield':
      body = <Path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6.3z" {...p} />;
      break;
    case 'sparkle':
      body = <Path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9zM18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" {...p} />;
      break;
    case 'list':
      body = <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...p} />;
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
