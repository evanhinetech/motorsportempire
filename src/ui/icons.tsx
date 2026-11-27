// Line icons and car drawings (react-native-svg, included in Expo Go).

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { SegmentId } from '../engine/types';
import type { Tab } from './tabs';

export function TabIcon({ tab, color, size = 24 }: { tab: Tab; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <View style={{ position: 'relative' }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {tab === 'hq' && (<><Path d="M3 21 V10 L12 4 L21 10 V21 Z" {...p} /><Path d="M9 21 V14 H15 V21" {...p} /></>)}
      {tab === 'cars' && (<><Path d="M3 16 L5 11 L9 10 L12 6 H17 L20 10 V16 Z" {...p} /><Circle cx={7.5} cy={17} r={2} {...p} /><Circle cx={17} cy={17} r={2} {...p} /></>)}
      {tab === 'research' && (<><Path d="M9 3 H15 M10 3 V9 L5 19 Q4 21 6 21 H18 Q20 21 19 19 L14 9 V3" {...p} /><Path d="M7 15 H17" {...p} /></>)}
      {tab === 'racing' && (<><Path d="M5 21 V3" {...p} /><Path d="M6 4 H19 L16 8.5 L19 13 H6" {...p} /></>)}
      {tab === 'empire' && (<><Circle cx={12} cy={12} r={9} {...p} /><Path d="M3 12 H21 M12 3 Q16 12 12 21 Q8 12 12 3" {...p} /></>)}
    </Svg>
    </View>
  );
}

type Shape = 'compact' | 'sedan' | 'tall' | 'low';
const SHAPE: Record<SegmentId, Shape> = {
  economy: 'compact', hatchback: 'compact', sedan: 'sedan', suv: 'tall', truck: 'tall', commercial: 'tall',
  sports: 'low', supercar: 'low', hypercar: 'low',
};
const BODY: Record<Shape, { body: string; glass: string; wheels: [number, number] }> = {
  compact: { body: 'M5 22 L6 15 Q8 12 13 11 L22 10 L30 4 Q32 3 36 3 L50 3 Q55 3 57 6 L62 11 L70 12 Q74 13 74 17 L74 22 Z', glass: 'M31 6 L50 6 Q53 6 55 8 L58 11 L26 11 Z', wheels: [19, 60] },
  sedan: { body: 'M3 22 L4 16 Q6 13 12 13 L24 12 L32 6 Q34 5 38 5 L52 5 Q56 5 59 8 L63 12 L72 13 Q77 14 77 18 L77 22 Z', glass: 'M33 8 L52 8 Q55 8 57 10 L59 12 L28 12 Z', wheels: [17, 63] },
  tall: { body: 'M4 23 L4 12 Q4 9 8 9 L18 9 L24 3 Q25 2 28 2 L62 2 Q66 2 67 5 L70 11 Q76 12 76 16 L76 23 Z', glass: 'M26 5 L62 5 Q64 5 65 7 L67 10 L21 10 Z', wheels: [18, 62] },
  low: { body: 'M3 22 Q3 17 10 16 L26 13 Q34 6 44 6 Q56 6 64 12 L74 14 Q78 16 77 22 Z', glass: 'M31 12 Q38 8 45 8 Q53 8 58 12 Z', wheels: [19, 63] },
};

/** A side-on car in the brand's colours. */
export function CarArt({ segment, color, glass, tyre, outline, width = 76 }: { segment: SegmentId; color: string; glass: string; tyre: string; outline?: string; width?: number }) {
  const b = BODY[SHAPE[segment]];
  return (
    <View style={{ position: 'relative' }}>
    <Svg width={width} height={(width * 30) / 80} viewBox="0 0 80 30">
      <Path d={b.body} fill={color} stroke={outline ?? 'none'} strokeWidth={outline ? 1.5 : 0} />
      <Path d={b.glass} fill={glass} />
      <Circle cx={b.wheels[0]} cy={23} r={5.5} fill={tyre} />
      <Circle cx={b.wheels[1]} cy={23} r={5.5} fill={tyre} />
      <Circle cx={b.wheels[0]} cy={23} r={2} fill={glass} />
      <Circle cx={b.wheels[1]} cy={23} r={2} fill={glass} />
    </Svg>
    </View>
  );
}

export function FlagArt({ color, check, size = 30 }: { color: string; check: string; size?: number }) {
  return (
    <View style={{ position: 'relative' }}>
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Path d="M7 27 V4" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={8} y={5} width={16} height={10} fill={color} />
      <Rect x={8} y={5} width={4} height={5} fill={check} />
      <Rect x={16} y={5} width={4} height={5} fill={check} />
      <Rect x={12} y={10} width={4} height={5} fill={check} />
      <Rect x={20} y={10} width={4} height={5} fill={check} />
    </Svg>
    </View>
  );
}

export function PauseIcon({ color, playing }: { color: string; playing: boolean }) {
  return (
    <View style={{ position: 'relative' }}>
    <Svg width={18} height={18} viewBox="0 0 18 18">
      {playing ? (
        <><Rect x={3.5} y={2} width={4} height={14} rx={1} fill={color} /><Rect x={10.5} y={2} width={4} height={14} rx={1} fill={color} /></>
      ) : (
        <Path d="M5 2.5 L15.5 9 L5 15.5 Z" fill={color} />
      )}
    </Svg>
    </View>
  );
}
