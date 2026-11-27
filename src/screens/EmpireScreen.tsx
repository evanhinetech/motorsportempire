import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { ACHIEVEMENTS, FACTORIES, PHILOSOPHIES, REGIONS, REGION_MAP } from '../engine/data';
import {
  acquireRival, acquisitionPrice, acquisitionStatus, capacity, enterRegion, factoryUpkeep, loanLimit, marketingCost, money,
  regionStatus, repayLoan, setMarketing, upgradeFactory,
} from '../engine/sim';
import { theme } from '../ui/theme';
import { useActiveGame } from '../state/GameContext';
import { SalesSection } from './SalesReport';
import { Bar, Between, Button, C, Card, Pill, Row, Screen, Section, Segmented, Stat, font } from '../ui/kit';

export default function EmpireScreen() {
  const { game: s, act, resetGame } = useActiveGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const fac = FACTORIES[s.factoryLevel];
  const next = FACTORIES[s.factoryLevel + 1];
  const lastUnits = s.reports[0]?.unitsSold ?? 0;
  const owned = s.rivals.filter((r) => r.owned);

  return (
    <Screen>
      <Card>
        <Between>
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontWeight: '800', fontSize: 17 }]}>{s.company.logo} {s.company.name}</Text>
            <Text style={font.small}>{PHILOSOPHIES[s.company.philosophy].icon} {PHILOSOPHIES[s.company.philosophy].name} · founded in {s.company.country}</Text>
          </View>
        </Between>
        {owned.length > 0 && <Text style={{ color: C.gold, fontWeight: '700' }}>Group brands: {owned.map((r) => r.name).join(', ')}</Text>}
      </Card>

      <SalesSection s={s} />

      <Section title="Manufacturing">
        <Card>
          <Text style={[font.title, { fontSize: 18 }]}>{fac.name}</Text>
          <Row style={{ gap: 12 }}>
            <Stat small label="Capacity / qtr" value={capacity(s).toLocaleString()} />
            <Stat small label="Upkeep / qtr" value={money(factoryUpkeep(s))} />
          </Row>
          <Between><Text style={font.small}>Used last quarter</Text><Text style={font.small}>{lastUnits.toLocaleString()} cars</Text></Between>
          <Bar value={lastUnits} max={capacity(s)} color={lastUnits >= capacity(s) * 0.95 ? C.amber : C.green} />
          {next ? (
            <Button
              kind={lastUnits >= capacity(s) * 0.9 ? 'primary' : 'secondary'}
              label={`Upgrade to ${next.name}`}
              sub={`${money(next.cost)} · ${next.capacity.toLocaleString()} cars/qtr · room for ${next.maxEngineers} engineers`}
              disabled={s.money < next.cost}
              onPress={() => act(upgradeFactory)}
            />
          ) : (
            <Text style={{ color: C.gold }}>The largest manufacturing network on Earth.</Text>
          )}
        </Card>
      </Section>

      <Section title="Marketing">
        <Card>
          <Segmented
            options={[{ label: 'None', value: 0 }, { label: 'Local', value: 1 }, { label: 'National', value: 2 }, { label: 'Global', value: 3 }]}
            value={s.marketingLevel}
            onChange={(v) => act((g) => setMarketing(g, v as 0 | 1 | 2 | 3))}
          />
          <Text style={font.small}>
            {s.marketingLevel ? `${money(marketingCost(s))} per quarter. Builds awareness so more buyers consider your cars.` : 'Unknown brands sell few cars. Marketing builds awareness.'}
          </Text>
        </Card>
      </Section>

      <Section title="Markets">
        {REGIONS.map((r) => {
          const on = s.regions.includes(r.id);
          const st = regionStatus(s, r.id);
          return (
            <Card key={r.id} accent={on ? C.green : undefined}>
              <Between>
                <Text style={[font.body, { fontWeight: '800' }]}>{r.flag} {r.name}</Text>
                {on ? <Pill label={r.id === s.company.homeRegion ? 'HOME' : 'SELLING'} color={C.green} /> : null}
              </Between>
              <Text style={font.small}>{r.note}</Text>
              {!on && (
                st.ok ? (
                  <Button small label={`Open dealerships · ${money(r.entryCost)}`} disabled={s.money < r.entryCost} onPress={() => act((g) => enterRegion(g, r.id))} />
                ) : (
                  <Text style={{ color: C.amber, fontSize: 13 }}>Locked · {st.reason}</Text>
                )
              )}
            </Card>
          );
        })}
      </Section>

      <Section title="Competitors">
        {s.rivals.filter((r) => r.alive || r.owned || r.wealth < -80).map((r) => {
          const st = acquisitionStatus(s, r);
          const price = acquisitionPrice(s, r);
          return (
            <Card key={r.id} accent={r.owned ? C.gold : undefined}>
              <Between>
                <View style={{ flex: 1 }}>
                  <Text style={[font.body, { fontWeight: '800' }]}>{r.name}</Text>
                  <Text style={font.small}>{REGION_MAP[r.region].flag} {r.focus} · tech {r.tech.toFixed(1)}</Text>
                </View>
                {r.owned ? <Pill label="OWNED" color={C.gold} /> : !r.alive ? <Pill label="BANKRUPT" color={C.bad} /> : r.wealth < -20 ? <Pill label="STRUGGLING" color={C.amber} /> : null}
              </Between>
              <Between><Text style={font.small}>Prestige</Text><Text style={[font.num, { fontSize: 12 }]}>{r.prestige.toFixed(0)}</Text></Between>
              <Bar value={r.prestige} color={C.gold} height={4} />
              {r.alive && !r.owned && (
                st.ok ? (
                  <Button small label={`Acquire · ${money(price)}`} disabled={s.money < price} onPress={() => act((g) => acquireRival(g, r.id))} />
                ) : (
                  <Text style={[font.small, { fontSize: 12 }]}>Acquisition: {st.reason}</Text>
                )
              )}
            </Card>
          );
        })}
      </Section>

      {s.loanBalance > 0 && (
        <Section title="Finance">
          <Card>
            <Row style={{ gap: 12 }}>
              <Stat small label="Loan" value={money(s.loanBalance)} color={C.amber} />
              <Stat small label="Credit limit" value={money(loanLimit(s))} />
            </Row>
            <Text style={font.small}>The bank covers shortfalls automatically. Go past the limit and the company is bankrupt.</Text>
            <Button small label="Repay as much as possible" onPress={() => act((g) => repayLoan(g, g.loanBalance))} />
          </Card>
        </Section>
      )}

      <Section title={`Legacy (${s.achievements.length}/${ACHIEVEMENTS.length})`}>
        <Card style={{ gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const got = s.achievements.includes(a.id);
            return (
              <View key={a.id} style={{ flexDirection: 'row', gap: 10, opacity: got ? 1 : 0.4 }}>
                <View style={{ width: 14, height: 14, marginTop: 3, borderRadius: theme().radius <= 4 ? 0 : 7, backgroundColor: got ? C.gold : 'transparent', borderWidth: 2, borderColor: got ? C.gold : C.faint }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{a.name}</Text>
                  <Text style={[font.small, { fontSize: 12 }]}>{a.desc}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      </Section>

      {confirmReset ? (
        <Card accent={C.red}>
          <Text style={font.body}>Abandon {s.company.name} and start over? This deletes your save.</Text>
          <Row>
            <Button kind="danger" label="Yes, start over" onPress={resetGame} style={{ flex: 1 }} />
            <Button kind="ghost" label="Cancel" onPress={() => setConfirmReset(false)} />
          </Row>
        </Card>
      ) : (
        <Button kind="ghost" label="New game" onPress={() => setConfirmReset(true)} />
      )}
    </Screen>
  );
}
