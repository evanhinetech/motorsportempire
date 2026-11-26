import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { advanceQuarter, dateLabel, money } from './src/engine/sim';
import type { GameState } from './src/engine/types';
import CarsScreen from './src/screens/CarsScreen';
import EmpireScreen from './src/screens/EmpireScreen';
import HQScreen from './src/screens/HQScreen';
import RacingScreen from './src/screens/RacingScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import SetupScreen from './src/screens/SetupScreen';
import { GameProvider, useGame } from './src/state/GameContext';
import { Between, Button, C, Card, Sheet, font } from './src/ui/kit';
import { TABS, Tab } from './src/ui/tabs';

const TOP_INSET = Platform.OS === 'web' ? 0 : 48;
const BOTTOM_INSET = Platform.OS === 'ios' ? 24 : 8;

export default function App() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          <Root />
        </View>
      </View>
    </GameProvider>
  );
}

function Root() {
  const { game, loaded, toast } = useGame();
  if (!loaded) return null;
  return (
    <View style={{ flex: 1, paddingTop: TOP_INSET }}>
      {game ? <Shell /> : <SetupScreen />}
      {toast && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 150, alignItems: 'center' }}>
          <View style={{ backgroundColor: '#2A1416', borderColor: C.red, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: C.text, fontWeight: '700', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const QUARTER_MS = 10_000;

function Shell() {
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
      <TopBar />
      <View style={{ flex: 1 }}>
        {tab === 'hq' && <HQScreen go={setTab} />}
        {tab === 'cars' && <CarsScreen />}
        {tab === 'research' && <ResearchScreen />}
        {tab === 'racing' && <RacingScreen />}
        {tab === 'empire' && <EmpireScreen />}
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 72 + BOTTOM_INSET, gap: 8 }}>
        {recap && !s.gameOver && (
          <Pressable onPress={() => { setSummary(recap); setRecap(null); }} style={{ backgroundColor: C.panel2, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Between>
              <Text style={{ color: C.text, fontWeight: '700' }}>{dateLabel(recap.before.quarter)} done · {recap.after.reports[0].unitsSold.toLocaleString()} cars sold</Text>
              <Text style={[font.num, { color: recap.after.reports[0].profit >= 0 ? C.green : '#FF6B6B' }]}>{money(recap.after.reports[0].profit)}</Text>
            </Between>
            <Text style={[font.small, { fontSize: 11 }]}>Tap for details</Text>
          </Pressable>
        )}
        {s.gameOver ? (
          <Button kind="primary" label="Bankrupt · Start a new company" onPress={resetGame} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Start the clock' : 'Pause the clock'}
              onPress={() => setPaused((p) => !p)}
              style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 10, backgroundColor: paused ? C.red : C.panel2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>{paused ? '▶' : '❚❚'}</Text>
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Between>
                <Text style={{ color: C.text, fontWeight: '800' }}>{status}</Text>
                {paused && s.quarter === 0 && <Text style={[font.small, { fontSize: 12 }]}>Tap ▶ to start</Text>}
              </Between>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' }}>
                <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: running ? C.red : C.faint }} />
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.panel, paddingBottom: BOTTOM_INSET }}>
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
              <Text style={{ fontSize: 20, opacity: on ? 1 : 0.55 }}>{t.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: on ? C.text : C.faint }}>{t.label}</Text>
              {on && <View style={{ position: 'absolute', top: 0, height: 2, width: 28, backgroundColor: C.red }} />}
            </Pressable>
          );
        })}
      </View>

      {summary && <QuarterSummary before={summary.before} after={summary.after} onClose={() => setSummary(null)} />}
    </View>
  );
}

function TopBar() {
  const { game } = useGame();
  const s = game!;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: s.company.color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>{s.company.logo}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{s.company.name}</Text>
        <Text style={[font.small, { fontSize: 12 }]}>{dateLabel(s.quarter)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[font.num, { fontSize: 17, color: s.money < 100000 ? C.amber : C.text }]}>{money(s.money)}</Text>
        <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>★ {s.prestige.toFixed(1)} prestige</Text>
      </View>
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
          <Text style={[font.num, { fontSize: 24, color: r.profit >= 0 ? C.green : '#FF6B6B' }]}>{money(r.profit)}</Text>
        </Between>
        <Between><Text style={font.small}>Cars sold</Text><Text style={font.num}>{r.unitsSold.toLocaleString()}</Text></Between>
        <Between><Text style={font.small}>Revenue</Text><Text style={font.num}>{money(r.revenue)}</Text></Between>
        <Between>
          <Text style={font.small}>Prestige</Text>
          <Text style={[font.num, { color: dPrestige >= 0 ? C.gold : '#FF6B6B' }]}>{after.prestige.toFixed(1)} ({dPrestige >= 0 ? '+' : ''}{dPrestige.toFixed(2)})</Text>
        </Between>
      </Card>
      {news.length > 0 && (
        <Card style={{ gap: 8 }}>
          {news.map((n, i) => (
            <Text key={i} style={{ color: n.tone === 'bad' ? '#FF8A80' : n.tone === 'good' ? C.green : C.text, fontSize: 14, lineHeight: 19 }}>{n.text}</Text>
          ))}
        </Card>
      )}
      {after.gameOver && <Text style={{ color: '#FF6B6B', fontWeight: '800', fontSize: 16 }}>Your company is bankrupt.</Text>}
      <Button kind="primary" label="Continue" onPress={onClose} />
    </Sheet>
  );
}
