import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { advanceQuarter, dateLabel, money, yearOf } from './src/engine/sim';
import type { GameState } from './src/engine/types';
import CarsScreen from './src/screens/CarsScreen';
import EmpireScreen from './src/screens/EmpireScreen';
import HQScreen from './src/screens/HQScreen';
import RacingScreen from './src/screens/RacingScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import SetupScreen from './src/screens/SetupScreen';
import { GameProvider, useGame } from './src/state/GameContext';
import { Text } from './src/ui/Text';
import { PauseIcon, TabIcon } from './src/ui/icons';
import { Between, Button, C, Card, Sheet, applyTheme, font } from './src/ui/kit';
import { TABS, Tab } from './src/ui/tabs';
import { ERAS, GOOGLE_FONTS_URL, Theme, eraForYear, nativeFontAssets } from './src/ui/theme';

const TOP_INSET = Platform.OS === 'web' ? 0 : 48;
const BOTTOM_INSET = Platform.OS === 'ios' ? 24 : 8;

// Web: load the era fonts from Google Fonts. Phones: bundled font files, loaded by FontGate.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('era-fonts')) {
  const link = document.createElement('link');
  link.id = 'era-fonts';
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}

function FontGate({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts(Platform.OS === 'web' ? {} : nativeFontAssets());
  if (!loaded && !error) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <GameProvider>
      <FontGate>
        <Themed />
      </FontGate>
    </GameProvider>
  );
}

/** Picks the era from the in-game year and applies it before anything below renders. */
function Themed() {
  const { game } = useGame();
  const t = game ? eraForYear(yearOf(game.quarter)) : ERAS[0];
  applyTheme(t);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.id === 'millennium' && game ? 'light' : 'dark'} />
      <View style={{ flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Root t={t} />
      </View>
    </View>
  );
}

function Root({ t }: { t: Theme }) {
  const { game, loaded, toast } = useGame();
  if (!loaded) return null;
  return (
    <View style={{ flex: 1, paddingTop: game && t.id === 'millennium' ? 0 : TOP_INSET, backgroundColor: game && t.id === 'millennium' ? t.headerBg : t.bg }}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {game ? <Shell t={t} /> : <SetupScreen />}
      </View>
      {toast && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 160, alignItems: 'center' }}>
          <View style={{ backgroundColor: t.text, borderRadius: Math.min(t.radius, 12), paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: t.bg, fontWeight: '700', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const QUARTER_MS = 10_000;

function Shell({ t }: { t: Theme }) {
  const { game, setGame, resetGame, getGame, openSheets } = useGame();
  const s = game!;
  const [tab, setTab] = useState<Tab>('hq');
  const [summary, setSummary] = useState<{ before: GameState; after: GameState } | null>(null);
  const [recap, setRecap] = useState<{ before: GameState; after: GameState } | null>(null);
  // The clock starts paused whenever the app opens, so nothing happens before you're ready.
  const [paused, setPaused] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const running = !paused && openSheets === 0 && !s.gameOver;

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setElapsed((e) => e + dt);
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (elapsed < QUARTER_MS) return;
    setElapsed(0);
    const before = getGame();
    if (!before || before.gameOver) return;
    const after = advanceQuarter(before);
    setGame(after);
    setRecap({ before, after });
    if (after.gameOver) setSummary({ before, after });
  }, [elapsed, getGame, setGame]);

  // the small results banner fades after a few seconds
  useEffect(() => {
    if (!recap) return;
    const id = setTimeout(() => setRecap(null), 4000);
    return () => clearTimeout(id);
  }, [recap]);

  const left = Math.max(0, Math.ceil((QUARTER_MS - elapsed) / 1000));
  const pct = Math.min(1, elapsed / QUARTER_MS);
  const status = s.gameOver ? 'Bankrupt' : paused ? 'Paused' : openSheets > 0 ? 'Paused while this is open' : `${dateLabel(s.quarter)} ends in ${left}s`;

  return (
    <View style={{ flex: 1 }}>
      <TopBar t={t} />
      <View style={{ flex: 1 }}>
        {tab === 'hq' && <HQScreen go={setTab} />}
        {tab === 'cars' && <CarsScreen />}
        {tab === 'research' && <ResearchScreen />}
        {tab === 'racing' && <RacingScreen />}
        {tab === 'empire' && <EmpireScreen />}
      </View>

      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 74 + BOTTOM_INSET, gap: 8 }}>
        {recap && !s.gameOver && (
          <Pressable
            onPress={() => { setSummary(recap); setRecap(null); }}
            style={{ backgroundColor: t.panel, borderColor: t.cardBorder, borderWidth: Math.max(1, t.cardBorderWidth), borderRadius: Math.min(t.radius, 14), paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Between>
              <Text style={{ fontWeight: '700', flex: 1 }}>{dateLabel(recap.before.quarter)} done · {recap.after.reports[0].unitsSold.toLocaleString()} cars sold</Text>
              <Text style={[font.num, { color: recap.after.reports[0].profit >= 0 ? t.good : t.bad }]}>{money(recap.after.reports[0].profit)}</Text>
            </Between>
            <Text style={[font.small, { fontSize: 11 }]}>Tap for details</Text>
          </Pressable>
        )}
        {s.gameOver ? (
          <Button kind="primary" label="Bankrupt · Start a new company" onPress={resetGame} />
        ) : (
          <Clock t={t} status={status} pct={pct} running={running} paused={paused} onToggle={() => setPaused((p) => !p)} hint={paused && s.quarter === 0} />
        )}
      </View>

      <NavBar t={t} tab={tab} setTab={setTab} />

      {summary && <QuarterSummary before={summary.before} after={summary.after} onClose={() => setSummary(null)} />}
    </View>
  );
}

function Clock({ t, status, pct, running, paused, onToggle, hint }: { t: Theme; status: string; pct: number; running: boolean; paused: boolean; onToggle: () => void; hint: boolean }) {
  const turbo = t.id === 'turbo';
  const radius = t.id === 'garage' ? 30 : t.id === 'turbo' ? 0 : t.id === 'millennium' ? 28 : 22;
  const btnRadius = t.id === 'garage' ? 23 : t.id === 'turbo' ? 0 : t.id === 'millennium' ? 23 : 16;
  const segments = 10;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.clockBg, borderRadius: radius,
        padding: 6, paddingRight: 16, borderWidth: turbo ? 2 : t.id === 'millennium' ? 1 : 0, borderColor: turbo ? t.cardBorder : t.cardBorder,
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Start the clock' : 'Pause the clock'}
        onPress={onToggle}
        style={({ pressed }) => ({
          width: 46, height: 46, borderRadius: btnRadius, backgroundColor: t.clockButton, alignItems: 'center', justifyContent: 'center',
          borderWidth: turbo ? 2 : 0, borderColor: t.clockIcon, opacity: pressed ? 0.75 : 1, overflow: 'hidden',
        })}
      >
        {t.gloss && <LinearGradient pointerEvents="none" colors={t.gloss.button as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
        <View style={{ position: 'relative' }}><PauseIcon color={t.clockIcon} playing={!paused} /></View>
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Between>
          <Text style={turbo ? { fontFamily: 'lcd', fontSize: 21, color: t.clockText, lineHeight: 22 } : { color: t.clockText, fontWeight: '800', fontSize: 13 }}>
            {turbo ? status.toUpperCase() : status}
          </Text>
          {hint && <Text style={{ color: t.clockText, opacity: 0.75, fontSize: 12, fontWeight: '600' }}>Tap to start</Text>}
        </Between>
        {turbo ? (
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: segments }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 10, backgroundColor: i < Math.round(pct * segments) && running ? t.clockFill : i < Math.round(pct * segments) ? t.lcd!.dim : t.clockTrack }} />
            ))}
          </View>
        ) : (
          <View style={{ height: t.id === 'electric' ? 6 : 9, borderRadius: 5, backgroundColor: t.clockTrack, overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: running ? t.clockFill : t.faint, borderRadius: 5, overflow: 'hidden' }}>
              {t.gloss && running && <LinearGradient colors={t.gloss.fill as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function NavBar({ t, tab, setTab }: { t: Theme; tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <View style={{ borderTopWidth: t.id === 'turbo' ? 2 : 1, borderTopColor: t.id === 'garage' ? t.navBg : t.cardBorder, backgroundColor: t.navBg, paddingBottom: BOTTOM_INSET }}>
      {t.gloss && <LinearGradient pointerEvents="none" colors={t.gloss.header as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
      <View style={{ flexDirection: 'row' }}>
        {TABS.map((x) => {
          const on = x.id === tab;
          const color = on ? t.navActive : t.navText;
          return (
            <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={x.label} onPress={() => setTab(x.id)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, gap: 3 }}>
              <TabIcon tab={x.id} color={color} />
              <Text style={{ fontSize: 11, fontWeight: '800', color }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TopBar({ t }: { t: Theme }) {
  const { game } = useGame();
  const s = game!;
  const lowCash = s.money < 100000;
  const badge = (
    <View style={{ width: 42, height: 42, borderRadius: t.id === 'garage' ? 21 : t.id === 'turbo' ? 0 : 12, backgroundColor: s.company.color, alignItems: 'center', justifyContent: 'center', borderWidth: t.id === 'garage' ? 2 : 0, borderColor: t.cardBorder }}>
      <Text style={{ fontSize: 21, fontFamily: 'System' }}>{s.company.logo}</Text>
    </View>
  );
  const name = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: 'display', fontSize: t.id === 'electric' ? 18 : 20, color: t.headerText, lineHeight: 24 }} numberOfLines={1}>{s.company.name}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: t.headerDim }} numberOfLines={1}>{dateLabel(s.quarter)} · {t.name}</Text>
    </View>
  );

  if (t.id === 'turbo') {
    return (
      <View style={{ backgroundColor: t.headerBg, borderBottomWidth: 2, borderBottomColor: t.cardBorder, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -10, bottom: -10, flexDirection: 'row', gap: 5, transform: [{ skewX: '-24deg' }] }}>
          <View style={{ width: 18, backgroundColor: '#14234B' }} /><View style={{ width: 18, backgroundColor: '#4FA3DB' }} /><View style={{ width: 18, backgroundColor: '#D62828' }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingRight: 46 }}>
          {badge}
          {name}
          <View style={{ backgroundColor: t.lcd!.bg, paddingHorizontal: 7, paddingVertical: 3, alignItems: 'flex-end', borderWidth: 2, borderColor: t.cardBorder }}>
            <Text style={{ fontFamily: 'lcd', fontSize: 22, lineHeight: 22, color: lowCash ? t.lcd!.amber : t.lcd!.text }}>{money(s.money)}</Text>
            <Text style={{ fontFamily: 'lcd', fontSize: 15, lineHeight: 15, color: t.lcd!.amber }}>★ {s.prestige.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    );
  }

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
      {badge}
      {name}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[font.num, { fontSize: 21, color: lowCash ? (t.id === 'millennium' ? '#FFB547' : t.warn) : t.headerText }]}>{money(s.money)}</Text>
        <Text style={{ color: t.id === 'millennium' ? t.navActive : t.gold, fontSize: 13, fontWeight: '700' }}>★ {s.prestige.toFixed(1)} prestige</Text>
      </View>
    </View>
  );

  if (t.id === 'millennium') {
    return (
      <View style={{ backgroundColor: t.headerBg, paddingTop: TOP_INSET, borderBottomWidth: 1, borderBottomColor: '#5C6B80' }}>
        <LinearGradient pointerEvents="none" colors={t.gloss!.header as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        {content}
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: t.headerBg, borderBottomWidth: t.id === 'electric' ? 0 : 0 }}>
      {t.stripes === 'garage' && (
        <View>
          <View style={{ height: 6, backgroundColor: '#E2702A' }} />
          <View style={{ height: 6, backgroundColor: '#E8B13A' }} />
          <View style={{ height: 6, backgroundColor: '#6B3A1E' }} />
        </View>
      )}
      {content}
    </View>
  );
}

function QuarterSummary({ before, after, onClose }: { before: GameState; after: GameState; onClose: () => void }) {
  const r = after.reports[0];
  const news = after.news.filter((n) => n.q === before.quarter).slice(0, 12);
  const dPrestige = after.prestige - before.prestige;
  return (
    <Sheet visible onClose={onClose} title={`${dateLabel(before.quarter)} results`}>
      <Card>
        <Between>
          <Text style={font.body}>Profit</Text>
          <Text style={[font.num, { fontSize: 24, color: r.profit >= 0 ? C.green : C.bad }]}>{money(r.profit)}</Text>
        </Between>
        <Between><Text style={font.small}>Cars sold</Text><Text style={font.num}>{r.unitsSold.toLocaleString()}</Text></Between>
        <Between><Text style={font.small}>Revenue</Text><Text style={font.num}>{money(r.revenue)}</Text></Between>
        <Between>
          <Text style={font.small}>Prestige</Text>
          <Text style={[font.num, { color: dPrestige >= 0 ? C.gold : C.bad }]}>{after.prestige.toFixed(1)} ({dPrestige >= 0 ? '+' : ''}{dPrestige.toFixed(2)})</Text>
        </Between>
      </Card>
      {news.length > 0 && (
        <Card style={{ gap: 8 }}>
          {news.map((n, i) => (
            <Text key={i} style={{ color: n.tone === 'bad' ? C.bad : n.tone === 'good' ? C.green : C.text, fontSize: 14, lineHeight: 19 }}>{n.text}</Text>
          ))}
        </Card>
      )}
      {after.gameOver && <Text style={{ color: C.bad, fontWeight: '800', fontSize: 16 }}>Your company is bankrupt.</Text>}
      <Button kind="primary" label="Continue" onPress={onClose} />
    </Sheet>
  );
}
