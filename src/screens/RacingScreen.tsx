import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { TIERS, TRAIT_INFO } from '../engine/data';
import {
  acceptSponsor, chooseSeries, currentDriver, money, objectiveText, quarterOf, raceCarRating, raceDevCost, releaseDriver,
  setRaceDev, signDriver, standings, tierStatus, yearOf,
} from '../engine/sim';
import type { Driver } from '../engine/types';
import { useActiveGame } from '../state/GameContext';
import RaceViewer from './RaceViewer';
import { Bar, Between, Button, C, Card, Pill, Row, Screen, Section, Segmented, Sheet, Stat, font } from '../ui/kit';

export default function RacingScreen() {
  const { game: s, act } = useActiveGame();
  const [market, setMarket] = useState(false);
  const r = s.racing;
  const driver = currentDriver(s);
  const season = r.season;
  const activeTier = r.tier ?? r.pendingTier;
  const seasonOver = !season || season.roundsDone >= season.totalRounds;
  const nextYear = quarterOf(s.quarter) === 1 ? yearOf(s.quarter) : yearOf(s.quarter) + 1;

  return (
    <Screen>
      {season && r.tier !== null ? (
        <SeasonCard />
      ) : (
        <Card accent={C.amber}>
          <Text style={[font.body, { fontWeight: '800' }]}>No active season</Text>
          <Text style={font.small}>
            Seasons start each Q1. Pick a series below and sign a driver, and you'll race in {nextYear}. Racing wins prestige, which sells road cars.
          </Text>
        </Card>
      )}

      <Section title="Team">
        <Card>
          <Row style={{ gap: 12 }}>
            <Stat label="Car rating" value={activeTier !== null ? String(raceCarRating(s)) : '—'} color={C.red} />
            <Stat label="Field average" value={activeTier !== null ? String(TIERS[activeTier].fieldAvg) : '—'} />
          </Row>
          <Text style={font.small}>Car rating comes from your Engine, Chassis and Electronics research plus in-season development.</Text>
          <Text style={[font.small, { color: C.text, fontWeight: '700' }]}>Development budget</Text>
          <Segmented
            options={[{ label: 'Off', value: 0 }, { label: 'Low', value: 1 }, { label: 'Mid', value: 2 }, { label: 'High', value: 3 }]}
            value={r.devLevel}
            onChange={(v) => act((g) => setRaceDev(g, v as 0 | 1 | 2 | 3))}
          />
          <Text style={font.small}>{r.devLevel ? `+${(r.devLevel * 1.6).toFixed(1)} rating per quarter for ${money(raceDevCost(s))}` : 'No upgrades this quarter.'}</Text>
        </Card>
        <Card>
          {driver ? (
            <>
              <DriverRow d={driver} />
              <Row>
                <Button small label="Driver market" onPress={() => setMarket(true)} style={{ flex: 1 }} />
                <Button small kind="danger" label="Release" onPress={() => act(releaseDriver)} />
              </Row>
            </>
          ) : (
            <>
              <Text style={[font.body, { fontWeight: '800' }]}>No driver signed</Text>
              <Text style={font.small}>Better drivers only join prestigious brands.</Text>
              <Button kind="primary" label="Open driver market" onPress={() => setMarket(true)} />
            </>
          )}
        </Card>
      </Section>

      <Section title={`Series for ${nextYear}`}>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          <LadderRow label="Don't race next season" sub="Save money, but no racing prestige" on={r.pendingTier === null} onPress={() => act((g) => chooseSeries(g, null))} />
          {TIERS.map((t, i) => {
            const st = tierStatus(s, i);
            return (
              <LadderRow
                key={t.name}
                label={`${i + 1}. ${t.name}`}
                sub={st.ok ? `${money(t.seasonCost)} per season · ${t.rounds} rounds` : st.reason!}
                on={r.pendingTier === i}
                locked={!st.ok}
                current={r.tier === i}
                onPress={() => act((g) => chooseSeries(g, i))}
              />
            );
          })}
        </Card>
        {!seasonOver && <Text style={font.small}>Your choice takes effect when the next season starts.</Text>}
      </Section>

      {(r.sponsors.length > 0 || (activeTier !== null && r.sponsorOffers.length > 0)) && (
        <Section title="Sponsors">
          {r.sponsors.map((sp) => (
            <Card key={sp.id} accent={C.green}>
              <Between>
                <Text style={[font.body, { fontWeight: '800' }]}>{sp.name}</Text>
                <Pill label="SIGNED" color={C.green} />
              </Between>
              <Text style={font.small}>{money(sp.paymentPerQuarter)} per quarter while racing · bonus {money(sp.bonus)}</Text>
              <Text style={{ color: C.text, fontSize: 13 }}>🎯 {objectiveText(sp.objective)}</Text>
            </Card>
          ))}
          {r.sponsors.length < 2 &&
            r.sponsorOffers.map((sp) => (
              <Card key={sp.id}>
                <Between>
                  <Text style={[font.body, { fontWeight: '800' }]}>{sp.name}</Text>
                  <Pill label={sp.kind.toUpperCase()} />
                </Between>
                <Text style={font.small}>{money(sp.paymentPerQuarter)} per quarter while racing · bonus {money(sp.bonus)}</Text>
                <Text style={{ color: C.text, fontSize: 13 }}>🎯 {objectiveText(sp.objective)}</Text>
                <Button small kind="primary" label="Sign deal" onPress={() => act((g) => acceptSponsor(g, sp.id))} />
              </Card>
            ))}
          <Text style={font.small}>Hit objectives to earn bonuses and better offers. Up to two sponsors at a time.</Text>
        </Section>
      )}

      {r.history.length > 0 && (
        <Section title="History">
          <Card style={{ gap: 6 }}>
            {r.history.slice(0, 15).map((h) => (
              <Between key={h.year}>
                <Text style={font.body}>{h.year} · {TIERS[h.tier].name}</Text>
                <Text style={{ color: h.position === 1 ? C.gold : C.dim, fontWeight: '800' }}>{h.position === 1 ? '🏆 Champions' : `P${h.position}`}{h.wins ? ` · ${h.wins}W` : ''}</Text>
              </Between>
            ))}
          </Card>
        </Section>
      )}

      {market && <DriverMarket onClose={() => setMarket(false)} />}
    </Screen>
  );
}

function SeasonCard() {
  const { game: s } = useActiveGame();
  const season = s.racing.season!;
  const tier = TIERS[season.tier];
  const table = standings(season.entrants);
  const myPos = table.findIndex((e) => e.isPlayer);
  const shown = table.filter((_, i) => i < 5 || i === myPos);
  const lastRaces = season.results.slice(-4).reverse();
  const [watching, setWatching] = useState<number | null>(null);
  const watchRace = watching !== null ? season.results.find((r) => r.round === watching) : undefined;
  return (
    <Section title={`${season.year} ${tier.name}`} right={<Pill label={`ROUND ${season.roundsDone}/${season.totalRounds}`} color={C.amber} />}>
      <Card>
        {shown.map((e) => {
          const pos = table.indexOf(e) + 1;
          return (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, backgroundColor: e.isPlayer ? s.company.color + '22' : 'transparent', borderRadius: 6, paddingHorizontal: 6 }}>
              <Text style={[font.num, { width: 26, color: pos === 1 ? C.gold : C.dim }]}>P{pos}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: e.isPlayer ? '800' : '600' }} numberOfLines={1}>{e.team}</Text>
                <Text style={[font.small, { fontSize: 11 }]} numberOfLines={1}>{e.driver}</Text>
              </View>
              <Text style={[font.small, { width: 34, textAlign: 'right' }]}>{e.wins}W</Text>
              <Text style={[font.num, { width: 44, textAlign: 'right' }]}>{e.points}</Text>
            </View>
          );
        })}
        {lastRaces.length > 0 && (
          <View style={{ gap: 2, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
            <Button small kind="primary" label={`▶ Watch the latest race: ${lastRaces[0].name}`} onPress={() => setWatching(lastRaces[0].round)} />
            {lastRaces.map((rr) => {
              const p = rr.order.indexOf('player');
              return (
                <Pressable key={rr.round} onPress={() => setWatching(rr.round)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
                  <Text style={[font.small, { flex: 1 }]}>R{rr.round} {rr.name}{rr.wet ? ' 🌧️' : ''}</Text>
                  <Text style={{ color: p === 0 ? C.gold : p > 0 && p < 3 ? C.green : p < 0 ? C.bad : C.text, fontWeight: '800' }}>{p < 0 ? 'DNF' : `P${p + 1}`}</Text>
                  <Text style={{ color: C.blue, fontWeight: '700', fontSize: 13 }}>▶ Watch</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>
      {watchRace && <RaceViewer s={s} race={watchRace} onClose={() => setWatching(null)} />}
    </Section>
  );
}

function LadderRow({ label, sub, on, locked, current, onPress }: { label: string; sub: string; on: boolean; locked?: boolean; current?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={locked ? undefined : onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, opacity: locked ? 0.45 : 1 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.red : C.faint, alignItems: 'center', justifyContent: 'center' }}>
        {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.red }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '700' }}>{label}{locked ? ' · locked' : ''}</Text>
        <Text style={[font.small, { fontSize: 12 }]}>{sub}</Text>
      </View>
      {current && <Pill label="NOW" color={C.amber} />}
    </Pressable>
  );
}

function DriverRow({ d }: { d: Driver }) {
  return (
    <View style={{ gap: 6 }}>
      <Between>
        <View style={{ flex: 1 }}>
          <Text style={[font.body, { fontWeight: '800' }]}>{d.nationality} {d.name}</Text>
          <Text style={font.small}>Age {d.age} · {money(d.salary)}/qtr{d.wins ? ` · ${d.wins} wins` : ''}{d.titles ? ` · ${d.titles} titles` : ''}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[font.num, { fontSize: 22, color: d.skill >= 80 ? C.gold : C.text }]}>{d.skill}</Text>
          <Text style={[font.small, { fontSize: 10 }]}>SKILL</Text>
        </View>
      </Between>
      <Bar value={d.skill} color={d.skill >= 80 ? C.gold : C.red} height={4} />
      {d.traits.length > 0 && (
        <Row>
          {d.traits.map((t) => <Pill key={t} label={`${TRAIT_INFO[t].icon} ${TRAIT_INFO[t].name}`} color={C.blue} />)}
        </Row>
      )}
    </View>
  );
}

function DriverMarket({ onClose }: { onClose: () => void }) {
  const { game: s, act } = useActiveGame();
  const list = [...s.drivers].filter((d) => d.id !== s.racing.driverId).sort((a, b) => b.skill - a.skill);
  return (
    <Sheet visible onClose={onClose} title="Driver market">
      <Text style={font.small}>Signing fee is two quarters' salary. Drivers improve until their late twenties. Your prestige: {s.prestige.toFixed(1)}</Text>
      <Card style={{ gap: 6 }}>
        {Object.values(TRAIT_INFO).map((t) => (
          <Text key={t.name} style={[font.small, { fontSize: 12 }]}>{t.icon} {t.name}: {t.desc}</Text>
        ))}
      </Card>
      {list.map((d) => {
        const ok = s.prestige >= d.minPrestige;
        return (
          <Card key={d.id} style={{ opacity: ok ? 1 : 0.55 }}>
            <DriverRow d={d} />
            {ok ? (
              <Button small kind="primary" label={`Sign · ${money(d.salary * 2)} fee`} onPress={() => { if (act((g) => signDriver(g, d.id))) onClose(); }} />
            ) : (
              <Text style={{ color: C.amber, fontSize: 13 }}>Needs {d.minPrestige} prestige</Text>
            )}
          </Card>
        );
      })}
    </Sheet>
  );
}
