import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/GameContext';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle, LayoutChangeEvent } from 'react-native';

export const C = {
  bg: '#0B0C0F',
  panel: '#15171C',
  panel2: '#1D2027',
  line: '#2A2E37',
  text: '#F2F3F5',
  dim: '#9AA0AB',
  faint: '#5F6571',
  red: '#E10600',
  green: '#2BD576',
  amber: '#FFB020',
  blue: '#4C9BFF',
  gold: '#F5C542',
};

export const font = {
  title: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 } as TextStyle,
  h2: { fontSize: 13, fontWeight: '800', color: C.dim, letterSpacing: 1.2, textTransform: 'uppercase' } as TextStyle,
  body: { fontSize: 15, color: C.text } as TextStyle,
  small: { fontSize: 13, color: C.dim } as TextStyle,
  num: { fontVariant: ['tabular-nums'], fontWeight: '700', color: C.text } as TextStyle,
};

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 14 }}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: string }) {
  return (
    <View style={[styles.card, accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null, style]}>{children}</View>
  );
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <Text style={font.h2}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Between({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.rowBetween, style]}>{children}</View>;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  label, onPress, kind = 'secondary', disabled, small, style, sub,
}: { label: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; small?: boolean; style?: ViewStyle; sub?: string }) {
  const bg = kind === 'primary' ? C.red : kind === 'secondary' ? C.panel2 : kind === 'danger' ? '#3A1414' : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: C.line },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: 13 }, kind === 'danger' && { color: '#FF8A80' }]}>{label}</Text>
      {sub ? <Text style={styles.btnSub}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Pill({ label, color = C.dim, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? color + '22' }]}>
      <Text style={{ color, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={[font.small, { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }]}>{label}</Text>
      <Text style={[font.num, { fontSize: small ? 16 : 20, color: color ?? C.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function Bar({ value, max = 100, color = C.red, height = 6 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/** A touch slider built from core components so it works on iOS, Android and web. */
export function Slider({
  value, onChange, min = 0, max = 100, step = 5, color = C.red,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color?: string }) {
  const width = useRef(1);
  const set = (x: number) => {
    const t = Math.max(0, Math.min(1, x / width.current));
    const v = Math.round((min + t * (max - min)) / step) * step;
    if (v !== value) onChange(Math.max(min, Math.min(max, v)));
  };
  const pct = (value - min) / (max - min);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => (width.current = e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => set(e.nativeEvent.locationX)}
      onResponderMove={(e) => set(e.nativeEvent.locationX)}
      style={{ height: 32, justifyContent: 'center' }}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: C.line }}>
        <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: `${pct * 100}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11,
          backgroundColor: C.text, borderWidth: 3, borderColor: color,
        }}
      />
    </View>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.segment, on && { backgroundColor: C.red }]}>
            <Text style={{ color: on ? '#fff' : C.dim, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, disabled }: { label: string; on?: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.chip, on && { backgroundColor: C.red, borderColor: C.red }, disabled && { opacity: 0.35 }]}
    >
      <Text style={{ color: on ? '#fff' : C.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  // Any open sheet pauses the quarter clock.
  const { holdClock } = useGame();
  useEffect(() => {
    if (!visible) return;
    holdClock(1);
    return () => holdClock(-1);
  }, [visible, holdClock]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <Between style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={[font.title, { fontSize: 18 }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: C.dim, fontSize: 15, fontWeight: '700' }}>Close</Text>
            </Pressable>
          </Between>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function useToggle(initial = false) {
  const [v, set] = useState(initial);
  return [v, () => set((x) => !x), set] as const;
}

export const styles = StyleSheet.create({
  card: { backgroundColor: C.panel, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { color: C.text, fontWeight: '800', fontSize: 15 },
  btnSub: { color: '#ffffffaa', fontSize: 11, marginTop: 2, fontWeight: '600' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  segmented: { flexDirection: 'row', backgroundColor: C.panel2, borderRadius: 10, padding: 3, gap: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2 },
  sheetBackdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', borderWidth: 1, borderColor: C.line, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
