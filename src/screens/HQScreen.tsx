import React from 'react';
import { Text, View } from 'react-native';
import { TIERS } from '../engine/data';
import { capacity, carTitle, companyValue, currentDriver, dateLabel, money } from '../engine/sim';
import type { NewsItem } from '../engine/types';
import { useActiveGame } from '../state/GameContext';
import { Bar, Between, Button, C, Card, Row, Screen, Section, Stat, font } from '../ui/kit';
import type { Tab } from '../ui/tabs';

const toneColor: Record<NewsItem['tone'], string> = { good: C.green, bad: '#FF6B6B', neutral: C.dim, race: C.amber };

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
    { done: s.quarter > 0, text: 'Tap "End Quarter" to run the business', tab: 'hq' },
  ];
  const showSteps = steps.some((x) => !x.done) && s.quarter < 8;

  const history = s.reports.slice(0, 12).reverse();
  const maxAbs = Math.max(1, ...history.map((r) => Math.abs(r.profit)));

  return (
    <Screen>
      {showSteps && (
        <Card accent={C.red}>
          <Text style={[font.body, { fontWeight: '800' }]}>Getting started</Text>
          {steps.map((st) => (
            <Between key={st.text}>
              <Text style={{ color: st.done ? C.faint : C.text, textDecorationLine: st.done ? 'line-through' : 'none', flex: 1 }}>
                {st.done ? '✓ ' : '○ '}{st.text}
              </Text>
              {!st.done && st.tab !== 'hq' && <Button small label="Go" onPress={() => go(st.tab)} />}
            </Between>
          ))}
        </Card>
      )}

      <Card>
        <Row style={{ gap: 14 }}>
          <Stat label="Company value" value={money(companyValue(s))} />
          <Stat label="Last quarter" value={last ? money(last.profit) : '—'} color={last ? (last.profit >= 0 ? C.green : '#FF6B6B') : undefined} />
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
                      {r.profit < 0 && <View style={{ height: Math.max(2, h), backgroundColor: '#FF6B6B', borderRadius: 3 }} />}
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
        <Card>
          <Between>
            <Text style={font.body}>🚗 {prod.length} car{prod.length === 1 ? '' : 's'} on sale{dev.length ? ` · ${dev.length} in development` : ''}</Text>
            <Button small label="Cars" onPress={() => go('cars')} />
          </Between>
          {prod.slice(0, 4).map((c) => (
            <Between key={c.id}>
              <Text style={font.small}>{carTitle(c)}{c.legendary ? ' 🌟' : ''}</Text>
              <Text style={[font.num, { fontSize: 13 }]}>{c.unitsLastQuarter.toLocaleString()} sold</Text>
            </Between>
          ))}
          <Text style={font.small}>Factory capacity: {capacity(s).toLocaleString()} cars per quarter</Text>
        </Card>
        <Card>
          <Between>
            <Text style={font.body}>
              🏁 {s.racing.tier !== null ? TIERS[s.racing.tier].name : s.racing.pendingTier !== null ? `Entered for ${TIERS[s.racing.pendingTier].name}` : 'Not racing'}
            </Text>
            <Button small label="Racing" onPress={() => go('racing')} />
          </Between>
          {driver && <Text style={font.small}>Driver: {driver.nationality} {driver.name} ({driver.skill})</Text>}
          {s.racing.titles > 0 && <Text style={{ color: C.gold, fontWeight: '700' }}>🏆 {s.racing.titles} championship{s.racing.titles > 1 ? 's' : ''}</Text>}
        </Card>
      </Section>

      <Section title="News">
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {s.news.slice(0, 30).map((n, i) => (
            <View key={i} style={{ paddingVertical: 9, borderBottomWidth: i < 29 ? 1 : 0, borderBottomColor: C.line, flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 3, borderRadius: 2, backgroundColor: toneColor[n.tone] }} />
              <View style={{ flex: 1 }}>
                <Text style={[font.small, { fontSize: 11 }]}>{dateLabel(n.q)}</Text>
                <Text style={{ color: C.text, fontSize: 14, lineHeight: 19 }}>{n.text}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}
