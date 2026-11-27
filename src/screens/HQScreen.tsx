import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { SEGMENT_MAP, TIERS } from '../engine/data';
import { capacity, carTitle, companyValue, currentDriver, dateLabel, money, price, standings } from '../engine/sim';
import type { NewsItem } from '../engine/types';
import { useActiveGame } from '../state/GameContext';
import { Bar, Between, Button, C, Card, Row, Screen, Section, Stat, font } from '../ui/kit';
import type { Tab } from '../ui/tabs';
import { CarArt, FlagArt } from '../ui/icons';
import { Theme, theme } from '../ui/theme';

const toneColor = (tone: NewsItem['tone']) => ({ good: C.green, bad: C.bad, neutral: C.faint, race: C.amber })[tone];

interface Block { bg: string; text: string; dim: string; glass: string; tyre: string; check: string; gloss?: string[] }

/** The two coloured "at a glance" panels, styled for each era. */
function glanceBlocks(t: Theme): { car: Block; race: Block } {
  switch (t.id) {
    case 'garage':
      return { car: { bg: '#E2702A', text: '#2A170D', dim: '#4A2614', glass: '#F1E4C8', tyre: '#2A170D', check: '#2A170D' }, race: { bg: '#E8B13A', text: '#2A170D', dim: '#4A2E0A', glass: '#F1E4C8', tyre: '#2A170D', check: '#F1E4C8' } };
    case 'turbo':
      return { car: { bg: '#14234B', text: '#FFFFFF', dim: '#B9C4DB', glass: '#4FA3DB', tyre: '#0A1230', check: '#14234B' }, race: { bg: '#D62828', text: '#FFFFFF', dim: '#FFE1E1', glass: '#FFFFFF', tyre: '#14234B', check: '#14234B' } };
    case 'millennium':
      return { car: { bg: '#11161D', text: '#FFFFFF', dim: '#A9B6C8', glass: '#19B5E6', tyre: '#0B1018', check: '#11161D', gloss: ['#2A3442', '#11161D'] }, race: { bg: '#0B6FD0', text: '#FFFFFF', dim: '#E1F6FF', glass: '#FFFFFF', tyre: '#0B3D91', check: '#0B3D91', gloss: ['#5FD2FF', '#0B6FD0', '#0B3D91'] } };
    default:
      return { car: { bg: '#FFFFFF', text: '#0E1116', dim: '#545A64', glass: '#8E9AAF', tyre: '#0E1116', check: '#FFFFFF' }, race: { bg: '#0E1116', text: '#FFFFFF', dim: '#B4BAC4', glass: '#D8F63A', tyre: '#0E1116', check: '#0E1116' } };
  }
}

function Glance({ block, art, title, sub, value, unit, onPress }: { block: Block; art: React.ReactNode; title: string; sub: string; value: string; unit: string; onPress: () => void }) {
  const t = theme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: block.bg, borderRadius: t.radius <= 4 ? 0 : t.radius - 2, paddingVertical: 10, paddingHorizontal: 14, borderWidth: t.id === 'electric' ? 1 : 0, borderColor: t.cardBorder, opacity: pressed ? 0.85 : 1, overflow: 'hidden' })}>
      {block.gloss && <LinearGradient pointerEvents="none" colors={block.gloss as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
      {art}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: 'display', fontSize: 18, color: block.text }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: block.dim }} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: t.id === 'turbo' ? 'lcd' : 'num', fontSize: t.id === 'turbo' ? 26 : 20, color: block.text, lineHeight: t.id === 'turbo' ? 24 : undefined }}>{value}</Text>
        {unit ? <Text style={{ fontSize: 11, fontWeight: '800', color: block.dim }}>{unit}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function HQScreen({ go }: { go: (t: Tab) => void }) {
  const { game: s } = useActiveGame();
  const last = s.reports[0];
  const prod = s.cars.filter((c) => c.status === 'production');
  const dev = s.cars.filter((c) => c.status === 'development');
  const driver = currentDriver(s);

  const steps: { done: boolean; text: string; tab: Tab }[] = [
    { done: s.cars.length > 0, text: 'Design your first road car', tab: 'cars' },
    { done: s.racing.pendingTier !== null || s.racing.tier !== null, text: 'Pick a motorsport series', tab: 'racing' },
    { done: !!driver, text: 'Sign a racing driver', tab: 'racing' },
    { done: s.quarter > 0, text: 'Tap ▶ at the bottom to start the clock', tab: 'hq' },
  ];
  const showSteps = steps.some((x) => !x.done) && s.quarter < 8;

  const t = theme();
  const blocks = glanceBlocks(t);
  const season = s.racing.season;
  const raceTier = s.racing.tier ?? s.racing.pendingTier;
  const raceTitle = raceTier !== null ? TIERS[raceTier].name : 'Not racing';
  const myPos = season ? standings(season.entrants).findIndex((e) => e.isPlayer) + 1 : 0;
  const racePos = season && season.roundsDone > 0 ? `P${myPos}` : '—';

  const history = s.reports.slice(0, 12).reverse();
  const maxAbs = Math.max(1, ...history.map((r) => Math.abs(r.profit)));

  return (
    <Screen>
      {showSteps && (
        <Card accent={C.red}>
          <Text style={[font.title, { fontSize: 18 }]}>Getting started</Text>
          {steps.map((st) => (
            <Between key={st.text}>
              <Text style={{ color: st.done ? C.faint : C.text, textDecorationLine: st.done ? 'line-through' : 'none', flex: 1 }}>
                {st.done ? '✓  ' : '•  '}{st.text}
              </Text>
              {!st.done && st.tab !== 'hq' && <Button small label="Go" onPress={() => go(st.tab)} />}
            </Between>
          ))}
        </Card>
      )}

      <Card>
        <Row style={{ gap: 14 }}>
          <Stat label="Company value" value={money(companyValue(s))} />
          <Stat label="Last quarter" value={last ? money(last.profit) : '—'} color={last ? (last.profit >= 0 ? C.green : C.bad) : undefined} />
        </Row>
        <View style={{ gap: 6 }}>
          <Between><Text style={font.small}>Prestige</Text><Text style={[font.num, { color: C.gold }]}>{s.prestige.toFixed(1)}</Text></Between>
          <Bar value={s.prestige} color={C.gold} />
          <Between><Text style={font.small}>Public awareness</Text><Text style={font.num}>{s.awareness.toFixed(0)}</Text></Between>
          <Bar value={s.awareness} color={C.blue} />
        </View>
        {s.loanBalance > 0 && <Text style={{ color: C.amber }}>Bank loan outstanding: {money(s.loanBalance)} (2.5% interest per quarter)</Text>}
      </Card>

      {history.length > 1 && (
        <Section title="Profit, last 3 years">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 90, gap: 4 }}>
              {history.map((r) => {
                const h = (Math.abs(r.profit) / maxAbs) * 42;
                return (
                  <View key={r.q} style={{ flex: 1, height: 90, justifyContent: 'center' }}>
                    <View style={{ height: 45, justifyContent: 'flex-end' }}>
                      {r.profit >= 0 && <View style={{ height: Math.max(2, h), backgroundColor: C.green, borderRadius: 3 }} />}
                    </View>
                    <View style={{ height: 45 }}>
                      {r.profit < 0 && <View style={{ height: Math.max(2, h), backgroundColor: C.bad, borderRadius: 3 }} />}
                    </View>
                  </View>
                );
              })}
            </View>
            {last && (
              <View style={{ gap: 4 }}>
                <Between><Text style={font.small}>Car sales ({last.unitsSold.toLocaleString()} cars)</Text><Text style={font.num}>{money(last.revenue)}</Text></Between>
                <Between><Text style={font.small}>Build costs</Text><Text style={font.num}>{money(-last.carCosts)}</Text></Between>
                <Between><Text style={font.small}>Staff, research & marketing</Text><Text style={font.num}>{money(-(last.salaries + last.research + last.marketing))}</Text></Between>
                <Between><Text style={font.small}>Factory upkeep</Text><Text style={font.num}>{money(-last.factory)}</Text></Between>
                {(last.racing > 0 || last.sponsorIncome > 0) && (
                  <Between><Text style={font.small}>Racing, after sponsors & prizes</Text><Text style={font.num}>{money(last.sponsorIncome + last.prizeMoney - last.racing)}</Text></Between>
                )}
                {last.brandIncome > 0 && <Between><Text style={font.small}>Owned brands</Text><Text style={font.num}>{money(last.brandIncome)}</Text></Between>}
              </View>
            )}
          </Card>
        </Section>
      )}

      <Section title="At a glance">
        {prod.length === 0 && (
          <Card><Text style={font.small}>{dev.length ? `${dev.length} car${dev.length > 1 ? 's' : ''} in development.` : 'No cars on sale yet.'} Your best sellers will show here.</Text></Card>
        )}
        {[...prod].sort((a, b) => b.unitsLastQuarter - a.unitsLastQuarter).slice(0, 3).map((c) => (
          <Glance key={c.id} block={blocks.car} onPress={() => go('cars')}
            art={<CarArt segment={c.segment} color={s.company.color} glass={blocks.car.glass} tyre={blocks.car.tyre} outline={blocks.car.text} width={70} />}
            title={`${carTitle(c)}${c.legendary ? ' ★' : ''}`} sub={`${SEGMENT_MAP[c.segment].name} · ${price(c.price)}`}
            value={c.unitsLastQuarter.toLocaleString()} unit="sold" />
        ))}
        <Glance block={blocks.race} onPress={() => go('racing')}
          art={<FlagArt color={blocks.race.text} check={blocks.race.check} />}
          title={raceTitle} sub={driver ? `${driver.name}${season ? ` · round ${season.roundsDone} of ${season.totalRounds}` : ''}` : 'No driver signed'}
          value={racePos} unit={racePos === '—' ? '' : 'table'} />
        <Text style={font.small}>Factory capacity {capacity(s).toLocaleString()} cars per quarter{s.racing.titles > 0 ? ` · ${s.racing.titles} championship${s.racing.titles > 1 ? 's' : ''}` : ''}</Text>
      </Section>

      <Section title={t.newsTitle}>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {s.news.slice(0, 30).map((n, i) => (
            <View key={i} style={{ paddingVertical: 9, borderBottomWidth: i < 29 ? 1 : 0, borderBottomColor: C.line, flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 8, height: 8, marginTop: 5, borderRadius: t.radius <= 4 ? 0 : 4, backgroundColor: toneColor(n.tone) }} />
              <View style={{ flex: 1 }}>
                <Text style={[font.small, { fontSize: 11, fontWeight: '700' }]}>{dateLabel(n.q)}</Text>
                <Text style={{ fontSize: 14, lineHeight: 19 }}>{n.text}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
