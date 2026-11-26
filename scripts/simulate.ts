// Headless balance test: a simple bot plays N years and prints a yearly summary.
// Run: npx tsx scripts/simulate.ts [years] [seed] [philosophy]
import { SEGMENTS, STAT_KEYS, TECH_AREAS, TIERS, FACTORIES, REGIONS, TECH_INFO } from '../src/engine/data';
import * as E from '../src/engine/sim';
import type { GameState, Philosophy, Stats } from '../src/engine/types';

const years = Number(process.argv[2] ?? 40);
const seed = Number(process.argv[3] ?? 7);
const philosophy = (process.argv[4] ?? 'performance') as Philosophy;
const quiet = process.argv.includes('--quiet');

let s = E.newGame({ name: 'Bot Motors', logo: '🦅', color: '#E10600', philosophy, country: 'United Kingdom', seed });

function tryDo(f: () => GameState) {
  try { s = f(); return true; } catch { return false; }
}

function bestDesign(st: GameState, lineOf?: string, forceSeg?: string) {
  let best: { d: E.DesignDraft; profit: number; dev: number } | null = null;
  for (const seg of SEGMENTS) {
    if (forceSeg && seg.id !== forceSeg) continue;
    if (!E.segmentStatus(st, seg.id).ok) continue;
    for (const pt of (E.electricAvailable(st) ? ['petrol', 'electric'] : ['petrol']) as ('petrol' | 'electric')[]) {
      for (const lvl of [50, 75, 100]) {
        const focus = {} as Stats;
        for (const k of STAT_KEYS) focus[k] = seg.weights[k] >= 0.2 ? lvl : Math.max(20, lvl - 40);
        for (const pm of [0.8, 1, 1.2, 1.4, 1.7, 2.1]) {
          const base = E.suggestedPrice(st, { segment: seg.id, powertrain: pt, focus, name: 'x' });
          const d: E.DesignDraft = { segment: seg.id, powertrain: pt, focus, price: E.roundPrice(base * pm), name: `${seg.name}${st.quarter}`, lineOf };
          const p = E.previewDesign(st, d);
          if (p.devCost > st.money * 0.8) continue;
          const score = p.expectedProfit * 16 - p.devCost;
          if (!best || score > best.profit) best = { d, profit: score, dev: p.devCost };
        }
      }
    }
  }
  return best;
}

let lastYear = E.yearOf(s.quarter);
const rows: string[] = [];
let unitsYear = 0;
for (let q = 0; q < years * 4 && !s.gameOver; q++) {
  // --- road cars
  const prod = s.cars.filter((c) => c.status === 'production');
  const dev = s.cars.filter((c) => c.status === 'development');
  for (const c of prod) {
    if (c.quartersInProduction >= 14 && !dev.some((d) => d.name === c.name)) {
      const b = bestDesign(s, c.id, c.segment);
      if (b && b.profit > 0) tryDo(() => E.startDesign(s, b.d));
    }
    if (c.quartersInProduction > 8 && c.unitsLastQuarter === 0) tryDo(() => E.retireCar(s, c.id));
  }
  const cap = E.capacity(s);
  const lastUnits = s.reports[0]?.unitsSold ?? 0;
  if (dev.length === 0 && (prod.length === 0 || lastUnits < cap * 0.85) && prod.length < 6) {
    const b = bestDesign(s);
    if (b && b.profit > 0) tryDo(() => E.startDesign(s, b.d));
  }
  // --- factory & markets
  const next = FACTORIES[s.factoryLevel + 1];
  if (next && lastUnits >= cap * 0.95 && s.money > next.cost * 1.3) tryDo(() => E.upgradeFactory(s));
  for (const r of REGIONS) if (E.regionStatus(s, r.id).ok && s.money > r.entryCost * 2.5) tryDo(() => E.enterRegion(s, r.id));
  // --- staff & research
  if (s.money > 300_000 && s.engineers < E.maxEngineers(s)) tryDo(() => E.hireEngineers(s, Math.max(1, Math.floor(s.engineers * 0.3))));
  s = E.setResearchSpending(s, s.money > 2_000_000 ? 2 : 1);
  const year = E.yearOf(s.quarter);
  const order: (typeof TECH_AREAS[number])[] = [...TECH_AREAS].filter((a) => s.tech[a] < 10 && TECH_INFO[a].unlockYear <= year).sort((a, b) => s.tech[a] - s.tech[b]);
  if (order.length) tryDo(() => E.setResearchFocus(s, order[0]));
  s = E.setMarketing(s, s.money > 5_000_000 ? 2 : s.money > 800_000 ? 1 : 0);
  // --- racing (decide in Q4 for next season, or at very start)
  if (E.quarterOf(s.quarter) === 4 || s.quarter === 0) {
    let pick: number | null = null;
    for (let t = TIERS.length - 1; t >= 0; t--) {
      if (E.tierStatus(s, t).ok && s.money > TIERS[t].seasonCost * 1.5) { pick = t; break; }
    }
    tryDo(() => E.chooseSeries(s, pick));
    if (pick !== null) {
      const cur = E.currentDriver(s);
      const cands = s.drivers.filter((d) => d.minPrestige <= s.prestige && d.salary * 4 < TIERS[pick!].seasonCost * 0.6).sort((a, b) => b.skill - a.skill);
      if (cands[0] && (!cur || cands[0].skill > cur.skill + 5)) tryDo(() => E.signDriver(s, cands[0].id));
      for (const o of [...s.racing.sponsorOffers].sort((a, b) => b.paymentPerQuarter - a.paymentPerQuarter)) tryDo(() => E.acceptSponsor(s, o.id));
      s = E.setRaceDev(s, s.money > TIERS[pick].seasonCost * 3 ? 2 : 1);
    }
  }
  s = E.advanceQuarter(s);
  unitsYear += s.reports[0].unitsSold;
  const y = E.yearOf(s.quarter);
  if (y !== lastYear) {
    const yr = s.reports.slice(0, 4);
    const profit = yr.reduce((a, r) => a + r.profit, 0);
    const racing = yr.reduce((a, r) => a + r.racing, 0);
    const tier = s.racing.history[0] && s.racing.history[0].year === lastYear ? `${TIERS[s.racing.history[0].tier].short} P${s.racing.history[0].position}` : '-';
    rows.push(
      `${lastYear} | $${E.money(s.money).padStart(7)} | loan ${E.money(s.loanBalance).padStart(6)} | P${s.prestige.toFixed(1).padStart(5)} | A${s.awareness.toFixed(0).padStart(3)} | fac${s.factoryLevel} | eng ${String(s.engineers).padStart(4)} | units ${String(unitsYear).padStart(8)} | profit ${E.money(profit).padStart(7)} | racing ${E.money(racing).padStart(6)} | ${tier.padEnd(9)} | tech ${TECH_AREAS.map((a) => s.tech[a]).join('')} | cars ${s.cars.filter((c) => c.status === 'production').map((c) => `${c.segment}${c.powertrain === 'electric' ? '⚡' : ''}`).join(',')} | regions ${s.regions.length}`,
    );
    unitsYear = 0;
    lastYear = y;
  }
}
console.log(rows.join('\n'));
console.log('gameOver', s.gameOver, 'achievements', s.achievements.join(','), 'titles', s.racing.titles, 'alive rivals', s.rivals.filter((r) => r.alive).length);
if (!quiet) console.log(s.news.slice(0, 15).map((n) => `${E.dateLabel(n.q)} ${n.text}`).join('\n'));
