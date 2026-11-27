import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';
import { REGIONS, REGION_MAP, SEGMENT_MAP } from '../engine/data';
import { carTitle, money, price as fmtPrice } from '../engine/sim';
import type { CarModel, GameState, RegionId } from '../engine/types';
import { CarArt } from '../ui/icons';
import { Bar, Between, C, Card, Pill, Row, Section, Segmented, Stat, font } from '../ui/kit';


/** Profit after build costs for last quarter. Older saves lack the stored value, so estimate it. */
function lastProfit(c: CarModel) {
  return c.profitLastQuarter ?? c.unitsLastQuarter * (c.price - c.unitCost);
}
function lastRevenue(c: CarModel) {
  return c.revenueLastQuarter ?? c.unitsLastQuarter * c.price;
}

function trend(c: CarModel): { text: string; color: string } | null {
  const h = c.salesHistory ?? [];
  if (h.length < 2) return null;
  const prev = h[h.length - 2];
  const cur = h[h.length - 1];
  if (prev === 0) return cur > 0 ? { text: 'new', color: C.green } : null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { text: '±0%', color: C.dim };
  return pct > 0 ? { text: `▲ ${pct}%`, color: C.green } : { text: `▼ ${Math.abs(pct)}%`, color: C.bad };
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 34, gap: 3 }}>
        {data.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1, height: Math.max(2, (v / max) * 34), borderRadius: 2,
              backgroundColor: i === data.length - 1 ? C.red : C.faint,
            }}
          />
        ))}
      </View>
      <Text style={[font.small, { fontSize: 11 }]}>Cars sold per quarter, last {data.length} quarter{data.length === 1 ? '' : 's'}</Text>
    </View>
  );
}

export function SalesSection({ s }: { s: GameState }) {
  const [view, setView] = useState<'cars' | 'regions'>('cars');
  const onSale = s.cars.filter((c) => c.status === 'production');
  const last = s.reports[0];

  if (!last || onSale.length === 0) {
    return (
      <Section title="Sales">
        <Card>
          <Text style={font.small}>
            {onSale.length === 0
              ? 'No cars on sale yet. Once your first car launches, this shows what sells, what makes money and where.'
              : 'Sales figures appear after your first quarter of sales.'}
          </Text>
        </Card>
      </Section>
    );
  }

  const totalUnits = onSale.reduce((a, c) => a + c.unitsLastQuarter, 0);
  const totalProfit = onSale.reduce((a, c) => a + lastProfit(c), 0);
  const bestSeller = [...onSale].sort((a, b) => b.unitsLastQuarter - a.unitsLastQuarter)[0];
  const mostProfitable = [...onSale].sort((a, b) => lastProfit(b) - lastProfit(a))[0];
  const losing = onSale.filter((c) => c.price <= c.unitCost || (c.unitsLastQuarter > 0 && lastProfit(c) < 0));
  const limited = last.demand !== undefined && last.demand > last.unitsSold * 1.02;

  return (
    <Section title="Sales" right={<Text style={font.small}>Last quarter</Text>}>
      <Card>
        <Row style={{ gap: 12 }}>
          <Stat small label="Cars sold" value={totalUnits.toLocaleString()} />
          <Stat small label="Profit after build costs" value={money(totalProfit)} color={totalProfit >= 0 ? C.green : C.bad} />
        </Row>
        {limited && (
          <Text style={{ color: C.amber, fontSize: 13 }}>
            Buyers wanted {last.demand!.toLocaleString()} cars but your factory built {last.unitsSold.toLocaleString()}. A bigger factory or higher prices would earn more.
          </Text>
        )}
        <View style={{ gap: 4 }}>
          <Between><Text style={font.small}>Best seller</Text><Text style={{ color: C.text, fontWeight: '700' }}>{carTitle(bestSeller)} · {bestSeller.unitsLastQuarter.toLocaleString()}</Text></Between>
          <Between><Text style={font.small}>Most profitable</Text><Text style={{ color: C.text, fontWeight: '700' }}>{carTitle(mostProfitable)} · {money(lastProfit(mostProfitable))}</Text></Between>
          <Between>
            <Text style={font.small}>Losing money or below cost</Text>
            <Text style={{ color: losing.length ? C.bad : C.green, fontWeight: '700' }}>{losing.length ? losing.map((c) => carTitle(c)).join(', ') : 'None'}</Text>
          </Between>
        </View>
        <Text style={[font.small, { fontSize: 12 }]}>Profit here is sale price minus build cost. Staff, research, factory, marketing and racing costs come out of the company's total.</Text>
      </Card>

      <Segmented
        options={[{ label: 'By car', value: 'cars' }, { label: 'By region', value: 'regions' }]}
        value={view}
        onChange={(v) => setView(v as 'cars' | 'regions')}
      />

      {view === 'cars' ? (
        <ByCar cars={onSale} totalUnits={totalUnits} bestId={bestSeller.id} topProfitId={mostProfitable.id} brand={s.company.color} />
      ) : (
        <ByRegion s={s} cars={onSale} totalUnits={totalUnits} />
      )}
    </Section>
  );
}

function ByCar({ cars, totalUnits, bestId, topProfitId, brand }: { cars: CarModel[]; totalUnits: number; bestId: string; topProfitId: string; brand: string }) {
  const sorted = [...cars].sort((a, b) => b.unitsLastQuarter - a.unitsLastQuarter);
  return (
    <>
      {sorted.map((c) => {
        const profit = lastProfit(c);
        const margin = c.price - c.unitCost;
        const t = trend(c);
        const share = totalUnits ? c.unitsLastQuarter / totalUnits : 0;
        const belowCost = margin <= 0;
        const lostLastQuarter = c.unitsLastQuarter > 0 && profit < 0;
        const loss = belowCost || lostLastQuarter;
        const payingBack = !loss && c.profit < 0;
        const regions = (Object.entries(c.salesByRegion) as [RegionId, number][]).filter(([, u]) => u > 0).sort((a, b) => b[1] - a[1]);
        return (
          <Card key={c.id} accent={loss ? C.bad : c.id === bestId ? C.green : undefined}>
            <Between>
              <View style={{ flex: 1 }}>
                <Row style={{ flexWrap: 'nowrap', gap: 10 }}><CarArt segment={c.segment} color={brand} glass={C.panel2} tyre={C.text} outline={C.text} width={56} /><Text style={[font.title, { fontSize: 17, flex: 1 }]} numberOfLines={1}>{carTitle(c)}{c.legendary ? ' ★' : ''}</Text></Row>
                <Text style={font.small}>{SEGMENT_MAP[c.segment].name} · {fmtPrice(c.price)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {c.id === bestId && <Pill label="BEST SELLER" color={C.green} />}
                {c.id === topProfitId && c.id !== bestId && <Pill label="MOST PROFITABLE" color={C.gold} />}
                {belowCost && <Pill label="PRICED BELOW COST" color={C.bad} />}
                {lostLastQuarter && !belowCost && <Pill label="LOSING MONEY" color={C.bad} />}
                {payingBack && <Pill label="PAYING BACK DEVELOPMENT" color={C.amber} />}
                {c.unitsLastQuarter === 0 && !loss && <Pill label="NO SALES" color={C.bad} />}
              </View>
            </Between>

            <Row style={{ gap: 12 }}>
              <View style={{ flex: 1, minWidth: 80 }}>
                <Text style={[font.small, { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 }]}>Sold</Text>
                <Text style={[font.num, { fontSize: 16 }]}>{c.unitsLastQuarter.toLocaleString()}</Text>
                {t && <Text style={{ color: t.color, fontSize: 12, fontWeight: '700' }}>{t.text}</Text>}
              </View>
              <Stat small label="Profit" value={money(profit)} color={profit >= 0 ? C.green : C.bad} />
              <Stat small label="Per car" value={fmtPrice(margin)} color={margin > 0 ? C.green : C.bad} />
            </Row>

            <View style={{ gap: 4 }}>
              <Between><Text style={font.small}>Share of your sales</Text><Text style={[font.num, { fontSize: 12 }]}>{Math.round(share * 100)}%</Text></Between>
              <Bar value={share} max={1} color={C.blue} height={5} />
            </View>

            {(c.salesHistory?.length ?? 0) > 1 && <Spark data={c.salesHistory!} />}

            {regions.length > 0 && (
              <Text style={font.small}>
                {regions.map(([r, u]) => `${REGION_MAP[r].flag} ${REGION_MAP[r].name} ${u.toLocaleString()}`).join('   ·   ')}
              </Text>
            )}

            <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 3 }}>
              <Between><Text style={font.small}>Lifetime sold</Text><Text style={[font.num, { fontSize: 13 }]}>{c.unitsSold.toLocaleString()}</Text></Between>
              <Between><Text style={font.small}>Lifetime revenue</Text><Text style={[font.num, { fontSize: 13 }]}>{money(c.revenue)}</Text></Between>
              <Between>
                <Text style={font.small}>Lifetime profit after development{c.devCost ? ` (${money(c.devCost)})` : ''}</Text>
                <Text style={[font.num, { fontSize: 13, color: c.profit >= 0 ? C.green : C.bad }]}>{money(c.profit)}</Text>
              </Between>
            </View>

            {loss && (
              <Text style={{ color: C.bad, fontSize: 13 }}>
                {belowCost ? 'Its price is now at or below its build cost, so every sale loses money. Raise the price on the Cars tab or retire it.' : 'Lost money last quarter.'}
              </Text>
            )}
            {c.unitsLastQuarter === 0 && !loss && (
              <Text style={{ color: C.bad, fontSize: 13 }}>Nobody bought it last quarter. Try a lower price, a next generation, or retire it.</Text>
            )}
          </Card>
        );
      })}
    </>
  );
}

function ByRegion({ s, cars, totalUnits }: { s: GameState; cars: CarModel[]; totalUnits: number }) {
  const regions = s.regions
    .map((r) => {
      const rows = cars
        .map((c) => {
          const u = c.salesByRegion[r] ?? 0;
          const profit = c.unitsLastQuarter ? (lastProfit(c) * u) / c.unitsLastQuarter : 0;
          const revenue = c.unitsLastQuarter ? (lastRevenue(c) * u) / c.unitsLastQuarter : 0;
          return { c, u, profit, revenue };
        })
        .filter((x) => x.u > 0)
        .sort((a, b) => b.u - a.u);
      const units = rows.reduce((a, x) => a + x.u, 0);
      return {
        r, rows, units,
        profit: rows.reduce((a, x) => a + x.profit, 0),
        revenue: rows.reduce((a, x) => a + x.revenue, 0),
      };
    })
    .sort((a, b) => b.units - a.units);
  const notIn = REGIONS.filter((r) => !s.regions.includes(r.id));

  return (
    <>
      {regions.map(({ r, rows, units, profit, revenue }) => {
        const def = REGION_MAP[r];
        const share = totalUnits ? units / totalUnits : 0;
        return (
          <Card key={r}>
            <Between>
              <Text style={[font.body, { fontWeight: '800' }]}>{def.flag} {def.name}</Text>
              {r === s.company.homeRegion && <Pill label="HOME" color={C.green} />}
            </Between>
            <Row style={{ gap: 12 }}>
              <Stat small label="Cars sold" value={units.toLocaleString()} />
              <Stat small label="Revenue" value={money(revenue)} />
              <Stat small label="Profit" value={money(profit)} color={profit >= 0 ? C.green : C.bad} />
            </Row>
            <View style={{ gap: 4 }}>
              <Between><Text style={font.small}>Share of your sales</Text><Text style={[font.num, { fontSize: 12 }]}>{Math.round(share * 100)}%</Text></Between>
              <Bar value={share} max={1} color={C.blue} height={5} />
            </View>
            {rows.length === 0 ? (
              <Text style={{ color: C.bad, fontSize: 13 }}>None of your cars sold here last quarter. {def.note}</Text>
            ) : (
              <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
                {rows.map(({ c, u, profit: p }) => (
                  <View key={c.id} style={{ gap: 3 }}>
                    <Between>
                      <Text style={{ color: C.text, fontWeight: '700', flex: 1 }} numberOfLines={1}>{carTitle(c)}</Text>
                      <Text style={[font.num, { fontSize: 13 }]}>{u.toLocaleString()}</Text>
                      <Text style={[font.num, { fontSize: 13, width: 72, textAlign: 'right', color: p >= 0 ? C.green : C.bad }]}>{money(p)}</Text>
                    </Between>
                    <Bar value={u} max={units} color={C.faint} height={4} />
                  </View>
                ))}
                <Text style={[font.small, { fontSize: 11 }]}>Cars sold and profit after build costs, last quarter</Text>
              </View>
            )}
            <Text style={[font.small, { fontSize: 12 }]}>{def.note}</Text>
          </Card>
        );
      })}
      {notIn.length > 0 && (
        <Text style={font.small}>Not selling in {notIn.map((r) => `${r.flag} ${r.name}`).join(', ')} yet. Open dealerships under Markets.</Text>
      )}
    </>
  );
}
