// Era themes: the game's look changes as the in-game calendar moves through the decades.
// applyTheme() writes the active era's tokens into the shared `C` palette (see kit.tsx),
// so every component that reads C at render time picks up the new look.

import { Platform } from 'react-native';

export type EraId = 'garage' | 'turbo' | 'millennium' | 'electric';
export type FontRole = 'display' | 'num' | 'lcd' | 'body';

/** Font faces: the family name expo-font registers on phones, and the Google Fonts family on web. */
export const FACES = {
  righteous: { native: 'Righteous_400Regular', web: 'Righteous', weight: 400 },
  archivo400: { native: 'Archivo_400Regular', web: 'Archivo', weight: 400 },
  archivo600: { native: 'Archivo_600SemiBold', web: 'Archivo', weight: 600 },
  archivo800: { native: 'Archivo_800ExtraBold', web: 'Archivo', weight: 800 },
  sairaCond800: { native: 'SairaCondensed_800ExtraBold', web: 'Saira Condensed', weight: 800 },
  saira400: { native: 'Saira_400Regular', web: 'Saira', weight: 400 },
  saira600: { native: 'Saira_600SemiBold', web: 'Saira', weight: 600 },
  saira700: { native: 'Saira_700Bold', web: 'Saira', weight: 700 },
  vt323: { native: 'VT323_400Regular', web: 'VT323', weight: 400 },
  exo400: { native: 'Exo2_400Regular', web: 'Exo 2', weight: 400 },
  exo600: { native: 'Exo2_600SemiBold', web: 'Exo 2', weight: 600 },
  exo700: { native: 'Exo2_700Bold', web: 'Exo 2', weight: 700 },
  exo800i: { native: 'Exo2_800ExtraBold_Italic', web: 'Exo 2', weight: 800 },
  sora600: { native: 'Sora_600SemiBold', web: 'Sora', weight: 600 },
  sora700: { native: 'Sora_700Bold', web: 'Sora', weight: 700 },
  manrope400: { native: 'Manrope_400Regular', web: 'Manrope', weight: 400 },
  manrope600: { native: 'Manrope_600SemiBold', web: 'Manrope', weight: 600 },
  manrope700: { native: 'Manrope_700Bold', web: 'Manrope', weight: 700 },
} as const;
export type FaceKey = keyof typeof FACES;

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Righteous&family=Archivo:wght@400;600;800&family=Saira+Condensed:wght@800&family=Saira:wght@400;600;700&family=VT323&family=Exo+2:ital,wght@0,400;0,600;0,700;1,800&family=Sora:wght@600;700&family=Manrope:wght@400;600;700&display=swap';

export interface Theme {
  id: EraId;
  name: string;
  from: number; // first year of the era
  // surfaces
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  cardBorder: string;
  cardBorderWidth: number;
  radius: number;
  // text
  text: string;
  dim: string;
  faint: string;
  // brand colours
  accent: string; // primary buttons, selection
  onAccent: string;
  accent2: string; // secondary highlight
  onAccent2: string;
  // meaning
  good: string;
  bad: string;
  warn: string;
  gold: string; // prestige
  info: string; // research, awareness
  // chrome
  headerBg: string;
  headerText: string;
  headerDim: string;
  navBg: string;
  navText: string;
  navActive: string;
  clockBg: string;
  clockText: string;
  clockTrack: string;
  clockFill: string;
  clockButton: string;
  clockIcon: string;
  /** Glossy gradients, used only in the millennium era. */
  gloss?: { header: string[]; button: string[]; fill: string[]; panel: string[] };
  /** The 1980s LCD readout. */
  lcd?: { bg: string; text: string; dim: string; amber: string; off: string };
  stripes: 'garage' | 'turbo' | null;
  fonts: { display: FaceKey; num: FaceKey; lcd: FaceKey; body: Record<400 | 600 | 700 | 800, FaceKey> };
  displayUpper: boolean;
  displaySkew: boolean;
  newsTitle: string;
}

export const ERAS: Theme[] = [
  {
    id: 'garage', name: 'Garage era', from: 0,
    bg: '#F1E4C8', panel: '#F7EDD8', panel2: '#E8D8B6', line: '#C9AE83', cardBorder: '#3B2416', cardBorderWidth: 2.5, radius: 18,
    text: '#3B2416', dim: '#6E4527', faint: '#9A7553',
    accent: '#E2702A', onAccent: '#2A170D', accent2: '#E8B13A', onAccent2: '#2A170D',
    good: '#2F7A3B', bad: '#B3261E', warn: '#A0480F', gold: '#9A5A0C', info: '#2F6690',
    headerBg: '#F1E4C8', headerText: '#3B2416', headerDim: '#6E4527',
    navBg: '#3B2416', navText: '#CDB894', navActive: '#E8B13A',
    clockBg: '#3B2416', clockText: '#F1E4C8', clockTrack: '#6B3A1E', clockFill: '#E8B13A', clockButton: '#E2702A', clockIcon: '#3B2416',
    stripes: 'garage',
    fonts: { display: 'righteous', num: 'righteous', lcd: 'righteous', body: { 400: 'archivo400', 600: 'archivo600', 700: 'archivo800', 800: 'archivo800' } },
    displayUpper: true, displaySkew: false, newsTitle: 'The Wire',
  },
  {
    id: 'turbo', name: 'Turbo era', from: 1985,
    bg: '#F4F5F7', panel: '#FFFFFF', panel2: '#E6EAF0', line: '#C9D0DC', cardBorder: '#14234B', cardBorderWidth: 2, radius: 2,
    text: '#14234B', dim: '#44527A', faint: '#7F8BA6',
    accent: '#D62828', onAccent: '#FFFFFF', accent2: '#14234B', onAccent2: '#FFFFFF',
    good: '#1E7A3C', bad: '#B3121E', warn: '#A35200', gold: '#9A6B00', info: '#2B6CB0',
    headerBg: '#FFFFFF', headerText: '#14234B', headerDim: '#44527A',
    navBg: '#FFFFFF', navText: '#44527A', navActive: '#D62828',
    clockBg: '#1C2A21', clockText: '#B6F2A8', clockTrack: '#34493A', clockFill: '#B6F2A8', clockButton: 'transparent', clockIcon: '#B6F2A8',
    lcd: { bg: '#1C2A21', text: '#B6F2A8', dim: '#8FB59A', amber: '#FFC94A', off: '#34493A' },
    stripes: 'turbo',
    fonts: { display: 'sairaCond800', num: 'sairaCond800', lcd: 'vt323', body: { 400: 'saira400', 600: 'saira600', 700: 'saira700', 800: 'saira700' } },
    displayUpper: true, displaySkew: true, newsTitle: 'Telex',
  },
  {
    id: 'millennium', name: 'Millennium era', from: 1997,
    bg: '#E4E8EE', panel: '#FFFFFF', panel2: '#DCE2EA', line: '#BAC3CF', cardBorder: '#A7B1BF', cardBorderWidth: 1, radius: 16,
    text: '#11161D', dim: '#4E5B6D', faint: '#7D8898',
    accent: '#0B6FD0', onAccent: '#FFFFFF', accent2: '#11161D', onAccent2: '#FFFFFF',
    good: '#1D7A3E', bad: '#C62828', warn: '#A64B00', gold: '#8F5A00', info: '#0B6FD0',
    headerBg: '#11161D', headerText: '#FFFFFF', headerDim: '#A9B6C8',
    navBg: '#11161D', navText: '#A9B6C8', navActive: '#5FD2FF',
    clockBg: '#F3F5F8', clockText: '#11161D', clockTrack: '#C3CBD6', clockFill: '#19B5E6', clockButton: '#0B6FD0', clockIcon: '#FFFFFF',
    gloss: {
      header: ['#2A3442', '#11161D'],
      button: ['#5FD2FF', '#0B6FD0', '#0B3D91'],
      fill: ['#9FE3FF', '#19B5E6', '#0B6FD0'],
      panel: ['#FFFFFF', '#EEF1F5'],
    },
    stripes: null,
    fonts: { display: 'exo800i', num: 'exo700', lcd: 'exo700', body: { 400: 'exo400', 600: 'exo600', 700: 'exo700', 800: 'exo700' } },
    displayUpper: false, displaySkew: false, newsTitle: 'Newsfeed',
  },
  {
    id: 'electric', name: 'Electric era', from: 2015,
    bg: '#F4F4F1', panel: '#FFFFFF', panel2: '#ECECE7', line: '#E0E0DA', cardBorder: '#E0E0DA', cardBorderWidth: 1, radius: 20,
    text: '#0E1116', dim: '#545A64', faint: '#80868F',
    accent: '#0E1116', onAccent: '#FFFFFF', accent2: '#2E5BD8', onAccent2: '#FFFFFF',
    good: '#1C7C45', bad: '#C42B2B', warn: '#A64B00', gold: '#7D6100', info: '#2E5BD8',
    headerBg: '#F4F4F1', headerText: '#0E1116', headerDim: '#545A64',
    navBg: '#FFFFFF', navText: '#7B818B', navActive: '#0E1116',
    clockBg: '#0E1116', clockText: '#FFFFFF', clockTrack: '#2A2F38', clockFill: '#D8F63A', clockButton: '#D8F63A', clockIcon: '#0E1116',
    stripes: null,
    fonts: { display: 'sora600', num: 'sora600', lcd: 'sora600', body: { 400: 'manrope400', 600: 'manrope600', 700: 'manrope700', 800: 'manrope700' } },
    displayUpper: false, displaySkew: false, newsTitle: 'Latest',
  },
];

export function eraForYear(year: number): Theme {
  let t = ERAS[0];
  for (const e of ERAS) if (year >= e.from) t = e;
  return t;
}

let current: Theme = ERAS[0];
export const theme = () => current;
export function setTheme(t: Theme) {
  current = t;
}

/** Style for a font face: one registered family per weight on phones, a CSS family + weight on web. */
export function face(key: FaceKey): { fontFamily: string; fontWeight?: '400' | '600' | '700' | '800' } {
  const f = FACES[key];
  if (Platform.OS === 'web') {
    return { fontFamily: `'${f.web}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`, fontWeight: String(f.weight) as '400' };
  }
  return { fontFamily: f.native };
}

/** Font asset modules for expo-font, loaded once at start-up on phones. */
export function nativeFontAssets() {
  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    Righteous_400Regular: require('@expo-google-fonts/righteous/400Regular/Righteous_400Regular.ttf'),
    Archivo_400Regular: require('@expo-google-fonts/archivo/400Regular/Archivo_400Regular.ttf'),
    Archivo_600SemiBold: require('@expo-google-fonts/archivo/600SemiBold/Archivo_600SemiBold.ttf'),
    Archivo_800ExtraBold: require('@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf'),
    SairaCondensed_800ExtraBold: require('@expo-google-fonts/saira-condensed/800ExtraBold/SairaCondensed_800ExtraBold.ttf'),
    Saira_400Regular: require('@expo-google-fonts/saira/400Regular/Saira_400Regular.ttf'),
    Saira_600SemiBold: require('@expo-google-fonts/saira/600SemiBold/Saira_600SemiBold.ttf'),
    Saira_700Bold: require('@expo-google-fonts/saira/700Bold/Saira_700Bold.ttf'),
    VT323_400Regular: require('@expo-google-fonts/vt323/400Regular/VT323_400Regular.ttf'),
    Exo2_400Regular: require('@expo-google-fonts/exo-2/400Regular/Exo2_400Regular.ttf'),
    Exo2_600SemiBold: require('@expo-google-fonts/exo-2/600SemiBold/Exo2_600SemiBold.ttf'),
    Exo2_700Bold: require('@expo-google-fonts/exo-2/700Bold/Exo2_700Bold.ttf'),
    Exo2_800ExtraBold_Italic: require('@expo-google-fonts/exo-2/800ExtraBold_Italic/Exo2_800ExtraBold_Italic.ttf'),
    Sora_600SemiBold: require('@expo-google-fonts/sora/600SemiBold/Sora_600SemiBold.ttf'),
    Sora_700Bold: require('@expo-google-fonts/sora/700Bold/Sora_700Bold.ttf'),
    Manrope_400Regular: require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
    Manrope_600SemiBold: require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
    Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  };
}
