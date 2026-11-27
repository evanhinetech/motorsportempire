// Text and TextInput that use the current era's fonts.
// Pass fontFamily 'display', 'num' or 'lcd' to use that role's face; otherwise the body face
// is picked from fontWeight (phones register one family per weight, so the weight is folded in).

import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, TextInputProps, TextProps, TextStyle } from 'react-native';
import { FaceKey, face, theme } from './theme';

const ROLES = new Set(['display', 'num', 'lcd']);

function weightOf(w: TextStyle['fontWeight']): 400 | 600 | 700 | 800 {
  const n = w === 'bold' ? 700 : w === 'normal' || w === undefined ? 400 : Number(w);
  return n >= 800 ? 800 : n >= 700 ? 700 : n >= 600 ? 600 : 400;
}

export function themedStyle(style: TextProps['style']): TextStyle[] {
  const st = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const t = theme();
  const fam = st.fontFamily;
  if (fam && !ROLES.has(fam)) return [st];
  let key: FaceKey;
  let extra: TextStyle = {};
  if (fam === 'display' || fam === 'num' || fam === 'lcd') {
    key = t.fonts[fam];
    if (fam === 'display') {
      extra = {
        ...(t.displayUpper ? { textTransform: 'uppercase' as const } : {}),
        ...(t.displaySkew ? { transform: [{ skewX: '-8deg' }] } : {}),
      };
    }
  } else {
    key = t.fonts.body[weightOf(st.fontWeight)];
  }
  const base: TextStyle = { ...st, fontWeight: undefined, color: st.color ?? t.text };
  return [base, face(key), extra];
}

export function Text(props: TextProps) {
  return <RNText {...props} style={themedStyle(props.style)} />;
}

export function TextInput(props: TextInputProps) {
  return <RNTextInput {...props} style={themedStyle(props.style)} />;
}
