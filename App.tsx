import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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

function Shell() {
  const { game, setGame, resetGame } = useGame();
  const s = game!;
  const [tab, setTab] = useState<Tab>('hq');
  const [summary, setSummary] = useState<{ before: GameState; after: GameState } | null>(null);

  const endQuarter = () => {
    const after = advanceQuarter(s);
    setGame(after);
    setSummary({ before: s, after });
  };

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

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 72 + BOTTOM_INSET }}>
        {s.gameOver ? (
          <Button kind="primary" label="Bankrupt · Start a new company" onPress={resetGame} />
        ) : (
          <Button kind="primary" label={`End ${dateLabel(s.quarter)} ▸`} onPress={endQuarter} style={{ shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }} />
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
