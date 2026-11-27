import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { useGame } from '../state/GameContext';
import { Text } from './Text';
import { ERAS, Theme, setTheme, theme } from './theme';

/**
 * The active era's palette. applyTheme() rewrites these values, and components read them at
 * render time, so the whole UI changes look when the era changes.
 * red = primary accent, green = good, amber = warning, blue = info, gold = prestige.
 */
export const C = {
  bg: '', panel: '', panel2: '', line: '', cardBorder: '', text: '', dim: '', faint: '',
  red: '', onAccent: '', accent2: '', onAccent2: '',
  green: '', bad: '', amber: '', blue: '', gold: '',
};

export const font = {
  title: {} as TextStyle,
  h2: {} as TextStyle,
  body: {} as TextStyle,
  small: {} as TextStyle,
  num: {} as TextStyle,
};

export function applyTheme(t: Theme) {
  setTheme(t);
  Object.assign(C, {
    bg: t.bg, panel: t.panel, panel2: t.panel2, line: t.line, cardBorder: t.cardBorder,
    text: t.text, dim: t.dim, faint: t.faint,
    red: t.accent, onAccent: t.onAccent, accent2: t.accent2, onAccent2: t.onAccent2,
    green: t.good, bad: t.bad, amber: t.warn, blue: t.info, gold: t.gold,
  });
  font.title = { fontFamily: 'display', fontSize: 22, color: t.text };
  font.h2 = t.displayUpper
    ? { fontFamily: 'display', fontSize: 15, color: t.dim, letterSpacing: 1 }
    : { fontFamily: 'display', fontSize: 16, color: t.text };
  font.body = { fontSize: 15, color: t.text };
  font.small = { fontSize: 13, color: t.dim };
  font.num = { fontFamily: 'num', fontVariant: ['tabular-nums'], color: t.text };
}
applyTheme(ERAS[0]);

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 150, gap: 14 }}>
      {children}
    </ScrollView>
  );
}

export function cardStyle(): ViewStyle {
  const t = theme();
  return { backgroundColor: t.panel, borderRadius: t.radius, padding: 14, gap: 10, borderWidth: t.cardBorderWidth, borderColor: t.cardBorder };
}

/** A panel. `accent` colours its border to flag state (a legend, a warning, a signed sponsor). */
export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: string }) {
  return (
    <View style={[cardStyle(), accent ? { borderColor: accent, borderWidth: Math.max(2, theme().cardBorderWidth) } : null, style]}>{children}</View>
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

/** Background fill for primary controls: a glossy gradient in the millennium era, flat otherwise. */
export function Fill({ colors, radius }: { colors?: string[]; radius: number }) {
  if (!colors) return null;
  return <LinearGradient pointerEvents="none" colors={colors as [string, string, ...string[]]} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  label, onPress, kind = 'secondary', disabled, small, style, sub,
}: { label: string; onPress: () => void; kind?: BtnKind; disabled?: boolean; small?: boolean; style?: ViewStyle; sub?: string }) {
  const t = theme();
  const radius = Math.min(t.radius, 12);
  const bg = kind === 'primary' ? t.accent : kind === 'secondary' ? t.panel2 : 'transparent';
  const fg = kind === 'primary' ? t.onAccent : kind === 'danger' ? t.bad : t.text;
  const border = kind === 'ghost' ? t.line : kind === 'danger' ? t.bad : kind === 'secondary' && t.cardBorderWidth >= 2 ? t.cardBorder : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, borderRadius: radius, borderWidth: border === 'transparent' ? 0 : 1.5, borderColor: border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {kind === 'primary' && <Fill colors={t.gloss?.button} radius={radius} />}
      <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 13 : 15, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text style={{ color: fg, opacity: 0.8, fontSize: 11, marginTop: 2, fontWeight: '600', textAlign: 'center' }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Pill({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  const c = color ?? C.dim;
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? c + '1F', borderRadius: Math.min(theme().radius, 6), borderWidth: 1, borderColor: c + '55' }]}>
      <Text style={{ color: c, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={[font.small, { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }]}>{label}</Text>
      <Text style={[font.num, { fontSize: small ? 17 : 22, color: color ?? C.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function Bar({ value, max = 100, color, height = 6 }: { value: number; max?: number; color?: string; height?: number }) {
  const t = theme();
  const pct = Math.max(0, Math.min(1, value / max));
  const r = t.radius <= 4 ? 0 : height;
  return (
    <View style={{ height, borderRadius: r, backgroundColor: t.panel2, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color ?? t.accent, borderRadius: r }} />
    </View>
  );
}

/** A touch slider built from core components so it works on iOS, Android and web. */
export function Slider({
  value, onChange, min = 0, max = 100, step = 5, color,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color?: string }) {
  const t = theme();
  const c = color ?? t.accent;
  const width = useRef(1);
  const set = (x: number) => {
    const tt = Math.max(0, Math.min(1, x / width.current));
    const v = Math.round((min + tt * (max - min)) / step) * step;
    if (v !== value) onChange(Math.max(min, Math.min(max, v)));
  };
  const pct = (value - min) / (max - min);
  const knobR = t.radius <= 4 ? 2 : 11;
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
      <View pointerEvents="none" style={{ height: 6, borderRadius: t.radius <= 4 ? 0 : 3, backgroundColor: t.panel2 }}>
        <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: t.radius <= 4 ? 0 : 3, backgroundColor: c }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: `${pct * 100}%`, marginLeft: -11, width: 22, height: 22, borderRadius: knobR,
          backgroundColor: t.panel, borderWidth: 3, borderColor: c,
        }}
      />
    </View>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const t = theme();
  const r = Math.min(t.radius, 10);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.panel2, borderRadius: r, padding: 3, gap: 3, borderWidth: t.cardBorderWidth >= 2 ? 1.5 : 0, borderColor: t.cardBorder }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 9, borderRadius: Math.max(0, r - 2), alignItems: 'center', backgroundColor: on ? t.accent : 'transparent', overflow: 'hidden' }}>
            {on && <Fill colors={t.gloss?.button} radius={Math.max(0, r - 2)} />}
            <Text style={{ color: on ? t.onAccent : t.dim, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, disabled }: { label: string; on?: boolean; onPress: () => void; disabled?: boolean }) {
  const t = theme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 9, borderRadius: Math.min(t.radius, 10), borderWidth: 1.5,
        borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.panel, opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: on ? t.onAccent : t.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
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
  const t = theme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', borderWidth: t.cardBorderWidth, borderColor: t.cardBorder, width: '100%', maxWidth: 640, alignSelf: 'center', overflow: 'hidden' }}>
          <Between style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.line, backgroundColor: t.panel }}>
            <Text style={[font.title, { fontSize: 18, flex: 1 }]} numberOfLines={1}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={{ color: t.dim, fontSize: 15, fontWeight: '700' }}>Close</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  sheetBackdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
});
