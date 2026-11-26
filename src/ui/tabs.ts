export type Tab = 'hq' | 'cars' | 'research' | 'racing' | 'empire';

export const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hq', label: 'HQ', icon: '🏢' },
  { id: 'cars', label: 'Cars', icon: '🚗' },
  { id: 'research', label: 'R&D', icon: '🔬' },
  { id: 'racing', label: 'Racing', icon: '🏁' },
  { id: 'empire', label: 'Empire', icon: '🌍' },
];
