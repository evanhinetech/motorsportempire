import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '../ui/Text';
import { REGION_MAP, SEGMENTS, SEGMENT_MAP, STAT_KEYS, STAT_LABELS } from '../engine/data';
import {
  DesignDraft, cancelDesign, carTitle, electricAvailable, money, price as fmtPrice, previewDesign, retireCar, roundPrice,
  segmentStatus, setCarPrice, startDesign, statCaps, suggestedPrice,
} from '../engine/sim';
import type { CarModel, Powertrain, RegionId, SegmentId, Stats } from '../engine/types';
import { CarArt } from '../ui/icons';
import { useActiveGame } from '../state/GameContext';
import { Bar, Between, Button, C, Card, Chip, Pill, Row, Screen, Section, Segmented, Sheet, Slider, Stat, font } from '../ui/kit';

export default function CarsScreen() {
  const { game: s, act } = useActiveGame();
  const [designer, setDesigner] = useState<{ lineOf?: CarModel } | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const prod = s.cars.filter((c) => c.status === 'production');
  const dev = s.cars.filter((c) => c.status === 'development');
  const retired = s.cars.filter((c) => c.status === 'retired');

  return (
    <Screen>
      <Button label="＋ Design a new car" kind="primary" onPress={() => setDesigner({})} />

      {dev.length > 0 && (
        <Section title="In development">
          {dev.map((c) => (
            <Card key={c.id} accent={C.blue}>
              <Between>
                <Row style={{ flex: 1, flexWrap: 'nowrap', gap: 10 }}><CarArt segment={c.segment} color={s.company.color} glass={C.panel2} tyre={C.text} outline={C.text} width={64} /><Text style={[font.title, { fontSize: 18, flex: 1 }]} numberOfLines={1}>{carTitle(c)}</Text></Row>
                <Pill label={`${c.devQuartersLeft} QTR${c.devQuartersLeft > 1 ? 'S' : ''} LEFT`} color={C.blue} />
              </Between>
              <Text style={font.small}>{SEGMENT_MAP[c.segment].name} · launches at {fmtPrice(c.price)}</Text>
              <StatBars stats={c.stats} />
              <Button small kind="ghost" label="Cancel project (no refund)" onPress={() => act((g) => cancelDesign(g, c.id))} />
            </Card>
          ))}
        </Section>
      )}

      <Section title={`On sale (${prod.length})`}>
        {prod.length === 0 && (
          <Card><Text style={font.small}>No cars on sale yet. Design one to start earning money. A cheap economy car or hatchback is a safe first step.</Text></Card>
        )}
        {prod.map((c) => (
          <CarCard key={c.id} car={c} onNextGen={() => setDesigner({ lineOf: c })} />
        ))}
      </Section>

      {retired.length > 0 && (
        <Section title={`Past models (${retired.length})`} right={<Button small kind="ghost" label={showRetired ? 'Hide' : 'Show'} onPress={() => setShowRetired((x) => !x)} />}>
          {showRetired && retired.slice().reverse().map((c) => (
            <Card key={c.id}>
              <Between>
                <Text style={font.body}>{carTitle(c)}{c.legendary ? ' ★' : ''}</Text>
                <Text style={font.small}>{c.unitsSold.toLocaleString()} sold</Text>
              </Between>
              <Text style={font.small}>Lifetime profit {money(c.profit)}</Text>
            </Card>
          ))}
        </Section>
      )}

      {designer && <Designer lineOf={designer.lineOf} onClose={() => setDesigner(null)} />}
    </Screen>
  );
}

function StatBars({ stats, caps }: { stats: Stats; caps?: Stats }) {
  return (
    <View style={{ gap: 5 }}>
      {STAT_KEYS.map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[font.small, { width: 78, fontSize: 12 }]}>{STAT_LABELS[k]}</Text>
          <View style={{ flex: 1 }}><Bar value={stats[k]} color={C.red} height={5} /></View>
          <Text style={[font.num, { width: 26, textAlign: 'right', fontSize: 12 }]}>{stats[k]}</Text>
          {caps && <Text style={[font.small, { width: 30, fontSize: 11 }]}>/{Math.round(caps[k])}</Text>}
        </View>
      ))}
    </View>
  );
}

function CarCard({ car, onNextGen }: { car: CarModel; onNextGen: () => void }) {
  const { game: s, act } = useActiveGame();
  const def = SEGMENT_MAP[car.segment];
  const hasNext = s.cars.some((c) => c.status === 'development' && c.name === car.name);
  const aging = car.quartersInProduction >= 12;
  const margin = car.price - car.unitCost;
  const nudge = (pct: number) => act((g) => setCarPrice(g, car.id, roundPrice(car.price * (1 + pct))));
  return (
    <Card accent={car.legendary ? C.gold : undefined}>
      <Between>
        <View style={{ flex: 1 }}>
          <Row style={{ flexWrap: 'nowrap', gap: 10 }}><CarArt segment={car.segment} color={s.company.color} glass={C.panel2} tyre={C.text} outline={C.text} width={64} /><Text style={[font.title, { fontSize: 19, flex: 1 }]} numberOfLines={1}>{carTitle(car)}</Text></Row>
          <Text style={font.small}>{def.name} · on sale {Math.floor(car.quartersInProduction / 4)}y {car.quartersInProduction % 4}q</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {car.legendary && <Pill label="LEGEND" color={C.gold} />}
          {aging && <Pill label="AGEING" color={C.amber} />}
        </View>
      </Between>
      <Row style={{ gap: 12 }}>
        <Stat small label="Sold last qtr" value={car.unitsLastQuarter.toLocaleString()} />
        <Stat small label="Margin / car" value={fmtPrice(margin)} color={margin > 0 ? C.green : C.bad} />
        <Stat small label="Lifetime profit" value={money(car.profit)} color={car.profit >= 0 ? C.green : C.bad} />
      </Row>
      {Object.keys(car.salesByRegion).length > 1 && (
        <Text style={font.small}>
          {(Object.entries(car.salesByRegion) as [RegionId, number][]).map(([r, u]) => `${REGION_MAP[r].flag} ${u.toLocaleString()}`).join('   ')}
        </Text>
      )}
      <StatBars stats={car.stats} />
      <View style={{ gap: 4 }}>
        <Between><Text style={font.small}>Reputation</Text><Text style={[font.num, { fontSize: 12 }]}>{car.reputation.toFixed(0)}</Text></Between>
        <Bar value={car.reputation} color={C.gold} height={5} />
      </View>
      <Between>
        <Text style={font.small}>Price</Text>
        <Row>
          <Button small label="−5%" onPress={() => nudge(-0.05)} />
          <Text style={[font.num, { fontSize: 17, minWidth: 84, textAlign: 'center' }]}>{fmtPrice(car.price)}</Text>
          <Button small label="+5%" onPress={() => nudge(0.05)} />
        </Row>
      </Between>
      <Row>
        <Button small label={hasNext ? 'Next gen in development' : '⟳ Design next generation'} disabled={hasNext} onPress={onNextGen} style={{ flex: 1 }} />
        <Button small kind="danger" label="Retire" onPress={() => act((g) => retireCar(g, car.id))} />
      </Row>
    </Card>
  );
}

function defaultFocus(seg: SegmentId): Stats {
  const w = SEGMENT_MAP[seg].weights;
  const f = {} as Stats;
  for (const k of STAT_KEYS) f[k] = w[k] >= 0.25 ? 85 : w[k] >= 0.15 ? 65 : 45;
  return f;
}

function Designer({ lineOf, onClose }: { lineOf?: CarModel; onClose: () => void }) {
  const { game: s, act } = useActiveGame();
  const firstOk = SEGMENTS.find((x) => segmentStatus(s, x.id).ok)!.id;
  const [segment, setSegment] = useState<SegmentId>(lineOf?.segment ?? firstOk);
  const [powertrain, setPowertrain] = useState<Powertrain>(lineOf?.powertrain ?? 'petrol');
  const [focus, setFocus] = useState<Stats>(lineOf ? { ...lineOf.focus } : defaultFocus(segment));
  const [name, setName] = useState(lineOf?.name ?? SEGMENT_MAP[segment].modelNames[s.cars.length % SEGMENT_MAP[segment].modelNames.length]);
  const [price, setPrice] = useState(() => suggestedPrice(s, { segment, powertrain, focus, name }));

  const draft: DesignDraft = { segment, powertrain, focus, price, name, lineOf: lineOf?.id };
  const preview = useMemo(() => previewDesign(s, draft), [s, segment, powertrain, focus, price, lineOf]);
  const caps = statCaps(s, powertrain);
  const def = SEGMENT_MAP[segment];

  const pickSegment = (seg: SegmentId) => {
    setSegment(seg);
    const f = defaultFocus(seg);
    setFocus(f);
    const n = SEGMENT_MAP[seg].modelNames[s.cars.length % SEGMENT_MAP[seg].modelNames.length];
    setName(n);
    setPrice(suggestedPrice(s, { segment: seg, powertrain, focus: f, name: n }));
  };
  const autoPrice = () => setPrice(suggestedPrice(s, { segment, powertrain, focus, name }));
  const step = price < 20000 ? 250 : price < 200000 ? 1000 : 10000;

  const launch = () => {
    if (act((g) => startDesign(g, draft))) onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={lineOf ? `Next ${lineOf.name}` : 'Car designer'}>
      {!lineOf && (
        <Section title="Vehicle type">
          <Row>
            {SEGMENTS.map((x) => {
              const st = segmentStatus(s, x.id);
              return <Chip key={x.id} label={`${x.name}${st.ok ? '' : ' (locked)'}`} on={segment === x.id} disabled={!st.ok} onPress={() => pickSegment(x.id)} />;
            })}
          </Row>
          {SEGMENTS.filter((x) => !segmentStatus(s, x.id).ok).slice(0, 3).map((x) => (
            <Text key={x.id} style={font.small}>Locked · {x.name}: {segmentStatus(s, x.id).reason}</Text>
          ))}
        </Section>
      )}

      {electricAvailable(s) && (
        <Section title="Powertrain">
          <Segmented options={[{ label: '⛽ Petrol', value: 'petrol' }, { label: '🔋 Electric', value: 'electric' }]} value={powertrain} onChange={(v) => setPowertrain(v as Powertrain)} />
        </Section>
      )}

      {!lineOf && (
        <Section title="Model name">
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={16}
            style={{ color: C.text, fontSize: 20, fontWeight: '800', backgroundColor: C.panel, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.line }}
          />
        </Section>
      )}

      <Section title="Engineering focus">
        <Card>
          <Text style={font.small}>
            {def.name} buyers care most about {STAT_KEYS.filter((k) => def.weights[k] >= 0.25).map((k) => STAT_LABELS[k].toLowerCase()).join(' and ')}. More focus means better stats but a higher build cost.
          </Text>
          {STAT_KEYS.map((k) => (
            <View key={k} style={{ gap: 2 }}>
              <Between>
                <Text style={[font.body, { fontWeight: '700' }]}>{STAT_LABELS[k]}{def.weights[k] >= 0.25 ? ' ★' : ''}</Text>
                <Text style={font.small}>
                  <Text style={[font.num, { fontSize: 15 }]}>{preview.stats[k]}</Text> / {Math.round(caps[k])} max
                </Text>
              </Between>
              <Slider value={focus[k]} onChange={(v) => setFocus((f) => ({ ...f, [k]: v }))} />
            </View>
          ))}
          <Text style={[font.small, { fontSize: 12 }]}>Research raises the maximum for each stat.</Text>
        </Card>
      </Section>

      <Section title="Price">
        <Card>
          <Between>
            <Button small label="−" onPress={() => setPrice((p) => Math.max(step, roundPrice(p - step)))} />
            <View style={{ alignItems: 'center' }}>
              <Text style={[font.num, { fontSize: 26 }]}>{fmtPrice(price)}</Text>
              <Text style={font.small}>Typical {def.name.toLowerCase()}: {fmtPrice(def.refPrice)}</Text>
            </View>
            <Button small label="＋" onPress={() => setPrice((p) => roundPrice(p + step))} />
          </Between>
          <Button small kind="ghost" label="Suggest the most profitable price" onPress={autoPrice} />
        </Card>
      </Section>

      <Section title="Forecast">
        <Card>
          <Row style={{ gap: 12 }}>
            <Stat small label="Build cost" value={fmtPrice(preview.unitCost)} />
            <Stat small label="Margin / car" value={fmtPrice(preview.margin)} color={preview.margin > 0 ? C.green : C.bad} />
          </Row>
          <Row style={{ gap: 12 }}>
            <Stat small label="Demand / qtr" value={preview.demand.toLocaleString()} />
            <Stat small label="Est. profit / qtr" value={money(preview.expectedProfit)} color={preview.expectedProfit > 0 ? C.green : C.bad} />
          </Row>
          <Text style={font.small}>
            Buyer rating: {(Object.entries(preview.quality) as [RegionId, number][]).map(([r, q]) => `${REGION_MAP[r].flag} ${q}/100`).join('  ')}
          </Text>
          {preview.demand > preview.expectedUnits * 1.2 && (
            <Text style={{ color: C.amber, fontSize: 13 }}>Demand is higher than your factory can build. You could raise the price.</Text>
          )}
          {preview.demand < 20 && <Text style={{ color: C.bad, fontSize: 13 }}>Very few buyers at this price. Try lowering it or improving the car.</Text>}
        </Card>
      </Section>

      <Button
        kind="primary"
        label={`Start development · ${money(preview.devCost)}`}
        sub={`Ready in ${preview.devQuarters} quarters${s.money < preview.devCost ? ' · not enough money' : ''}`}
        disabled={s.money < preview.devCost}
        onPress={launch}
      />
      <Text style={[font.small, { textAlign: 'center' }]}>You have {money(s.money)}</Text>
    </Sheet>
  );
}

