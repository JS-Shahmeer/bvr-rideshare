import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { ICONS, type IconName } from './icon-paths';

export type { IconName };

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({ name, size = 19, color = colors.ink, strokeWidth = 1.85, fill = 'none' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map(([tag, attrs], i) => {
        const a = attrs as Record<string, string | number>;
        if (tag === 'circle') return <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} fill={(a.fill as string) ?? fill} />;
        if (tag === 'rect') return <Rect key={i} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx} fill={fill} />;
        return <Path key={i} d={a.d as string} fill={fill} />;
      })}
    </Svg>
  );
}
