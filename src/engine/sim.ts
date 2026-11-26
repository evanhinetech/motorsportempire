// Motorsport Empire simulation engine.
// Every action takes a GameState and returns a new GameState (the input is never mutated).
// Invalid actions throw a GameError with a player-facing message.

import {
  ACHIEVEMENTS, AI_TEAMS, COUNTRIES, ENGINEER_HIRE_FEE, ENGINEER_SALARY, FACTORIES, FIRST_NAMES,
  LAB_COST_PER_ENGINEER, LAST_NAMES, MAX_TECH, NATIONALITIES, POINTS, RACE_VENUES, REGIONS, REGION_MAP,
  RIVAL_SEEDS, SAVE_VERSION, SEGMENTS, SEGMENT_MAP, SPONSOR_NAMES, START_YEAR, STAT_KEYS, TECH_AREAS,
  TECH_INFO, TIERS, techLevelCost,
} from './data';
import type {
  CarModel, Driver, DriverTrait, Entrant, GameState, NewsItem, Philosophy, Powertrain, QuarterReport,
  RegionId, Rival, SegmentId, Sponsor, Stats, TechArea,
} from './types';

export class GameError extends Error {}

// ---------- RNG (deterministic, stored in state) ----------
function makeRng(s: GameState) {
  const next = () => {
    let t = (s.rngState = (s.rngState + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(1e-9, next());
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pick = <T,>(arr: T[]): T => arr[Math.floor(next() * arr.length)];
  const range = (a: number, b: number) => a + (b - a) * next();
  const int = (a: number, b: number) => Math.floor(range(a, b + 1));
  return { next, gauss, pick, range, int };
}
type Rng = ReturnType<typeof makeRng>;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const ramp = (year: number, y0: number, y1: number, v0: number, v1: number) => lerp(v0, v1, (year - y0) / (y1 - y0));
let idCounter = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(idCounter++).toString(36)}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- Time ----------
export const yearOf = (q: number) => START_YEAR + Math.floor(q / 4);
export const quarterOf = (q: number) => (q % 4) + 1;
export const dateLabel = (q: number) => `Q${quarterOf(q)} ${yearOf(q)}`;

// ---------- World trends ----------
function demandEventMult(year: number): number {
  if (year >= 1979 && year <= 1981) return 0.92;
  if (year >= 2008 && year <= 2009) return 0.85;
  if (year === 2020) return 0.8;
  return 1;
}

function segmentTrend(seg: SegmentId, year: number): number {
  const growth = Math.min(2.2, Math.pow(1.015, year - START_YEAR));
  let m = 1;
  switch (seg) {
    case 'suv': m = year < 1985 ? 0.35 : year < 2000 ? ramp(year, 1985, 2000, 0.35, 1) : ramp(year, 2000, 2020, 1, 2.1); break;
    case 'economy': m = ramp(year, 2000, 2025, 1, 0.75); break;
    case 'sedan': m = ramp(year, 2000, 2025, 1, 0.7); break;
    case 'supercar': case 'hypercar': m = ramp(year, 1985, 2025, 1, 2); break;
    case 'truck': m = ramp(year, 1990, 2010, 1, 1.25); break;
  }
  return growth * m * demandEventMult(year);
}

function trendWeightBonus(year: number): Partial<Stats> {
  let eff = 0;
  if (year >= 1979 && year <= 1986) eff += 0.15;
  if (year >= 2005) eff += ramp(year, 2005, 2025, 0, 0.12);
  return {
    efficiency: eff,
    technology: clamp(((year - START_YEAR) / 50) * 0.2, 0, 0.25),
    comfort: year >= 1990 ? 0.05 : 0,
  };
}

export function regionScale(region: RegionId, year: number): number {
  if (region === 'china') return year < 1995 ? 0 : ramp(year, 1995, 2025, 0.15, 1.6);
  return REGION_MAP[region].scale;
}

export function powertrainMult(pt: Powertrain, year: number, region: RegionId): number {
  if (pt === 'electric') {
    let m = year < 2000 ? 0.25 : year < 2010 ? ramp(year, 2000, 2010, 0.25, 0.6) : ramp(year, 2010, 2030, 0.6, 1.5);
    if (region === 'china') m *= 1.2;
    return m;
  }
  if (region === 'europe') return ramp(year, 2025, 2035, 1, 0.4);
  if (region === 'china') return ramp(year, 2028, 2035, 1, 0.5);
  return ramp(year, 2030, 2040, 1, 0.75);
}

function segmentWeights(seg: SegmentId, region: RegionId, year: number): Stats {
  const base = SEGMENT_MAP[seg].weights;
  const rb = REGION_MAP[region].statBonus;
  const tb = trendWeightBonus(year);
  const w = {} as Stats;
  let sum = 0;
  for (const k of STAT_KEYS) {
    w[k] = base[k] + (rb[k] ?? 0) + (tb[k] ?? 0);
    sum += w[k];
  }
  for (const k of STAT_KEYS) w[k] /= sum;
  return w;
}

export function qualityOf(stats: Stats, seg: SegmentId, region: RegionId, year: number): number {
  const w = segmentWeights(seg, region, year);
  return STAT_KEYS.reduce((a, k) => a + w[k] * stats[k], 0);
}

// ---------- Car design ----------
export interface DesignDraft {
  segment: SegmentId;
  powertrain: Powertrain;
  focus: Stats;
  price: number;
  name: string;
  lineOf?: string; // id of the car this is the next generation of
}

export function statCaps(s: GameState, pt: Powertrain): Stats {
  const t = s.tech;
  if (pt === 'electric') {
    return {
      performance: Math.min(100, 25 + t.electric * 7.5),
      efficiency: Math.min(100, 50 + t.electric * 5),
      comfort: Math.min(100, 30 + t.comfort * 7),
      technology: Math.min(100, 32 + t.electronics * 6.8),
      reliability: Math.min(100, 33 + t.manufacturing * 6.7),
    };
  }
  return {
    performance: Math.min(100, 30 + t.engine * 7),
    efficiency: Math.min(100, 30 + t.engine * 3.5 + t.chassis * 3.5),
    comfort: Math.min(100, 30 + t.comfort * 7),
    technology: Math.min(100, 30 + t.electronics * 7),
    reliability: Math.min(100, 33 + t.manufacturing * 6.7),
  };
}

export function segmentStatus(s: GameState, seg: SegmentId): { ok: boolean; reason?: string } {
  const def = SEGMENT_MAP[seg];
  for (const [area, lvl] of Object.entries(def.requires) as [TechArea, number][]) {
    if (s.tech[area] < lvl) return { ok: false, reason: `Needs ${TECH_INFO[area].name} level ${lvl}` };
  }
  if (def.requiresPrestige && s.prestige < def.requiresPrestige) {
    return { ok: false, reason: `Needs ${def.requiresPrestige} prestige` };
  }
  return { ok: true };
}

export function electricAvailable(s: GameState) {
  return s.tech.electric >= 3;
}

export function designNumbers(s: GameState, d: DesignDraft) {
  const def = SEGMENT_MAP[d.segment];
  const caps = statCaps(s, d.powertrain);
  const stats = {} as Stats;
  let focusSum = 0;
  for (const k of STAT_KEYS) {
    const f = clamp(d.focus[k], 0, 100);
    focusSum += f;
    stats[k] = Math.round((f / 100) * caps[k]);
  }
  let costMult = 0.5 + (focusSum / 100) * 0.25;
  costMult *= 1 - 0.035 * (s.tech.manufacturing - 1);
  if (s.company.philosophy === 'value') costMult *= 0.9;
  if (d.powertrain === 'electric') costMult *= 1.9 - 0.09 * s.tech.electric;
  const unitCost = Math.round(def.baseCost * costMult);
  let devCost = Math.round(def.devCost * (0.7 + focusSum / 500));
  if (d.powertrain === 'electric') devCost = Math.round(devCost * 1.4);
  if (d.lineOf) devCost = Math.round(devCost * 0.8); // next generation reuses parts
  return { stats, unitCost, devCost, devQuarters: def.devQuarters };
}

// ---------- Market ----------
function brandFactor(prestige: number, seg: SegmentId, region: RegionId) {
  const exp = SEGMENT_MAP[seg].prestigeSens * REGION_MAP[region].prestigeMult;
  return Math.pow((0.2 + prestige / 100) / 0.7, exp);
}

function rivalQuality(r: Rival, seg: SegmentId, region: RegionId, year: number) {
  const base = 18 + r.tech * 6.8;
  const w = segmentWeights(seg, region, year);
  const focusStat = r.focus === 'luxury' ? 'comfort' : r.focus === 'value' ? 'efficiency' : r.focus;
  return Math.min(96, base + w[focusStat] * 14);
}

function averageRivalQuality(s: GameState, seg: SegmentId, region: RegionId, year: number) {
  const rs = s.rivals.filter((r) => r.alive && r.segments.includes(seg));
  if (!rs.length) return 50;
  return rs.reduce((a, r) => a + rivalQuality(r, seg, region, year), 0) / rs.length;
}

function rivalPresence(r: Rival, region: RegionId, year: number) {
  if (r.region === region) return 1;
  if (r.region === 'china') return region === 'restOfWorld' && year >= 2005 ? 0.5 : year >= 2015 ? 0.3 : 0;
  if (region === 'china') return year >= 2000 ? 0.7 : 0.4;
  return 0.6;
}

function freshness(car: CarModel) {
  const a = car.quartersInProduction;
  return a < 12 ? 1 : Math.max(0.35, 1 - (a - 12) * 0.04);
}

function playerAppeal(s: GameState, car: Pick<CarModel, 'segment' | 'powertrain' | 'stats' | 'price' | 'lineReputation' | 'reputation' | 'legendary' | 'quartersInProduction'>, region: RegionId, year: number) {
  const def = SEGMENT_MAP[car.segment];
  const q = qualityOf(car.stats, car.segment, region, year);
  let elasticity = def.elasticity;
  if (s.company.philosophy === 'luxury') elasticity *= 0.85;
  const ratio = car.price / def.refPrice;
  const pf = Math.pow(ratio, -elasticity * 2);
  const qf = Math.pow(q / 50, 3);
  const brand = brandFactor(s.prestige, car.segment, region);
  const aware = 0.03 + 0.97 * (s.awareness / 100);
  const rep = 1 + Math.max(car.lineReputation, car.reputation * 0.5) / 150 + (car.legendary ? 0.15 : 0);
  const fresh = freshness(car as CarModel);
  return qf * pf * brand * aware * rep * fresh * powertrainMult(car.powertrain, year, region);
}

function competitionAppeal(s: GameState, seg: SegmentId, region: RegionId, year: number) {
  let total = 0;
  for (const r of s.rivals) {
    if (!r.alive || !r.segments.includes(seg)) continue;
    const pres = rivalPresence(r, region, year);
    if (!pres) continue;
    const q = rivalQuality(r, seg, region, year);
    const premium = r.focus === 'value' ? -0.08 : (r.prestige - 50) / 300;
    const pf = Math.pow(1 + premium, -SEGMENT_MAP[seg].elasticity * 2);
    // rivals gradually move to electric as the market shifts
    const evShare = clamp((year - 2012) / 20, 0, 0.9);
    const pt = (1 - evShare) * powertrainMult('petrol', year, region) + evShare * powertrainMult('electric', year, region);
    total += Math.pow(q / 50, 3) * pf * brandFactor(r.prestige, seg, region) * 0.92 * pres * pt;
  }
  // a long tail of small makers
  const otherQ = 18 + (2 + (year - START_YEAR) * 0.12) * 5;
  total += Math.pow(otherQ / 50, 3) * 0.8 * (seg === 'hypercar' || seg === 'supercar' ? 0.3 : 1);
  return total;
}

function segmentSize(seg: SegmentId, region: RegionId, year: number) {
  return SEGMENT_MAP[seg].baseDemand * regionScale(region, year) * REGION_MAP[region].segMult[seg] * segmentTrend(seg, year);
}

/** Demand per car per region for the current quarter (before capacity limits). */
function computeDemand(s: GameState, cars: CarModel[]) {
  const year = yearOf(s.quarter);
  const out = new Map<string, Partial<Record<RegionId, number>>>();
  const bySegRegion = new Map<string, number>();
  for (const region of s.regions) {
    for (const seg of SEGMENTS) {
      const mine = cars.filter((c) => c.segment === seg.id);
      if (!mine.length) continue;
      const size = segmentSize(seg.id, region, year);
      if (size <= 0) continue;
      const appeals = mine.map((c) => playerAppeal(s, c, region, year));
      const comp = competitionAppeal(s, seg.id, region, year);
      const total = appeals.reduce((a, b) => a + b, 0) + comp;
      mine.forEach((c, i) => {
        const d = (size * appeals[i]) / total;
        const rec = out.get(c.id) ?? {};
        rec[region] = d;
        out.set(c.id, rec);
      });
      bySegRegion.set(`${seg.id}:${region}`, appeals.reduce((a, b) => a + b, 0) / total);
    }
  }
  return { perCar: out, shares: bySegRegion };
}

export function capacity(s: GameState) {
  return FACTORIES[s.factoryLevel].capacity;
}

export function previewDesign(s: GameState, d: DesignDraft) {
  const nums = designNumbers(s, d);
  const year = yearOf(s.quarter + nums.devQuarters);
  const prev = d.lineOf ? s.cars.find((c) => c.id === d.lineOf) : undefined;
  const car: CarModel = {
    id: '__preview', name: d.name, generation: 1, segment: d.segment, powertrain: d.powertrain, focus: d.focus,
    stats: nums.stats, price: d.price, unitCost: nums.unitCost, status: 'production', devQuartersLeft: 0,
    launchedAt: s.quarter, unitsSold: 0, unitsLastQuarter: 0, revenue: 0, profit: 0,
    lineReputation: prev ? Math.max(prev.lineReputation * 0.5, prev.reputation) : 0, reputation: 0,
    legendary: false, salesByRegion: {}, quartersInProduction: 0,
  };
  const others = s.cars.filter((c) => c.status === 'production' && c.id !== d.lineOf);
  const fake = { ...s, quarter: s.quarter + nums.devQuarters };
  const { perCar } = computeDemand(fake, [...others, car]);
  const byRegion = perCar.get('__preview') ?? {};
  const demand = Object.values(byRegion).reduce((a, b) => a + (b ?? 0), 0);
  const quality: Partial<Record<RegionId, number>> = {};
  for (const r of s.regions) quality[r] = Math.round(qualityOf(nums.stats, d.segment, r, year));
  const freeCap = Math.max(0, capacity(s) - others.reduce((a, c) => a + c.unitsLastQuarter, 0));
  const expectedUnits = Math.min(demand, Math.max(freeCap, capacity(s) * 0.25));
  return {
    ...nums,
    quality,
    demand: Math.round(demand),
    expectedUnits: Math.round(expectedUnits),
    expectedProfit: Math.round(expectedUnits * (d.price - nums.unitCost)),
    margin: d.price - nums.unitCost,
  };
}

/** Price that maximises forecast profit given current factory capacity. */
export function suggestedPrice(s: GameState, d: Omit<DesignDraft, 'price'>) {
  const def = SEGMENT_MAP[d.segment];
  const { unitCost } = designNumbers(s, { ...d, price: def.refPrice });
  let best = roundPrice(Math.max(def.refPrice, unitCost * 1.2));
  let bestProfit = -Infinity;
  for (let m = 0.6; m <= 3; m += 0.05) {
    const price = roundPrice(def.refPrice * m);
    if (price <= unitCost) continue;
    const p = previewDesign(s, { ...d, price });
    if (p.expectedProfit > bestProfit) {
      bestProfit = p.expectedProfit;
      best = price;
    }
  }
  return best;
}

export function roundPrice(p: number) {
  const step = p < 20000 ? 100 : p < 200000 ? 500 : 5000;
  return Math.max(step, Math.round(p / step) * step);
}

// ---------- New game ----------
export interface NewGameOptions {
  name: string;
  logo: string;
  color: string;
  philosophy: Philosophy;
  country: string;
  seed?: number;
}

export function newGame(o: NewGameOptions): GameState {
  const country = COUNTRIES.find((c) => c.name === o.country) ?? COUNTRIES[0];
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  const tech = Object.fromEntries(TECH_AREAS.map((a) => [a, 1])) as Record<TechArea, number>;
  const ph = o.philosophy;
  if (ph === 'performance') tech.engine = 2;
  if (ph === 'reliability') tech.manufacturing = 2;
  if (ph === 'luxury') tech.comfort = 2;
  if (ph === 'innovation') tech.electronics = 2;
  if (ph === 'motorsport') tech.chassis = 2;
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    company: { name: o.name.trim() || 'Garage Motors', logo: o.logo, color: o.color, philosophy: ph, homeRegion: country.region, country: country.name },
    quarter: 0,
    money: 600_000,
    prestige: ph === 'motorsport' ? 4 : ph === 'luxury' ? 2 : 0,
    awareness: 3,
    marketingLevel: 0,
    engineers: 3,
    factoryLevel: 0,
    regions: [country.region],
    tech,
    researchProgress: Object.fromEntries(TECH_AREAS.map((a) => [a, 0])) as Record<TechArea, number>,
    researchFocus: 'engine',
    researchSpending: 1,
    cars: [],
    drivers: [],
    rivals: [],
    racing: {
      tier: null, driverId: null, devBonus: 0, devLevel: 0, season: null, history: [], titles: 0, unlockedTier: 0,
      sponsors: [], sponsorOffers: [], sponsorRelations: { luxury: 0, tech: 0, consumer: 0 }, pendingTier: null,
    },
    news: [],
    reports: [],
    achievements: [],
    loanBalance: 0,
    gameOver: false,
  };
  const rng = makeRng(s);
  s.rivals = RIVAL_SEEDS.map((r, i) => ({
    id: `rival${i}`, name: r.name, region: r.region, prestige: r.prestige, tech: r.tech,
    wealth: rng.range(50, 100), segments: r.segs as SegmentId[], focus: r.focus,
    alive: r.region !== 'china', foundedYear: r.region === 'china' ? 1995 : 1950, marketShare: 0, owned: false,
  }));
  s.drivers = Array.from({ length: 30 }, () => makeDriver(rng, s, true));
  s.racing.sponsorOffers = makeSponsorOffers(rng, s, 0);
  addNews(s, `${s.company.name} opens its doors in a small ${country.name} workshop. Design your first car!`, 'neutral');
  return s;
}

function makeDriver(rng: Rng, s: GameState, initial = false): Driver {
  const age = initial ? rng.int(17, 36) : rng.int(16, 20);
  // most drivers are average; a few are special
  const talent = clamp(42 + rng.gauss() * 13 + (rng.next() < 0.06 ? 15 : 0), 25, 96);
  const ageAdj = age < 24 ? -(24 - age) * 1.5 : age > 32 ? -(age - 32) * 1.2 : 0;
  const skill = Math.round(clamp(talent + ageAdj, 22, 97));
  const traits: DriverTrait[] = [];
  const all: DriverTrait[] = ['qualifier', 'wet', 'consistent', 'developer', 'fanFavourite'];
  for (const t of all) if (rng.next() < 0.18) traits.push(t);
  const fame = traits.includes('fanFavourite') ? 20 : 0;
  return {
    id: uid('d'),
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
    nationality: rng.pick(NATIONALITIES),
    age,
    skill,
    traits,
    popularity: clamp(Math.round(skill * 0.4 + fame + rng.range(0, 15)), 0, 100),
    salary: driverSalary(skill, traits),
    minPrestige: Math.max(0, Math.round((skill - 48) * 1.15)),
    wins: 0,
    titles: 0,
  };
}

function driverSalary(skill: number, traits: DriverTrait[]) {
  const base = 2000 * Math.exp((skill - 40) / 8.6);
  return Math.round((base * (1 + traits.length * 0.12)) / 500) * 500;
}

/** Prestige is hard to earn (gains shrink as it rises) and easy to lose. */
function addPrestige(s: GameState, delta: number) {
  if (delta > 0) delta *= Math.max(0.15, 1.15 - s.prestige / 100);
  s.prestige = clamp(s.prestige + delta, 0, 100);
}

function addNews(s: GameState, text: string, tone: NewsItem['tone']) {
  s.news.unshift({ q: s.quarter, text, tone });
  if (s.news.length > 160) s.news.length = 160;
}

// ---------- Player actions ----------
export function startDesign(state: GameState, d: DesignDraft): GameState {
  const s = clone(state);
  const st = segmentStatus(s, d.segment);
  if (!st.ok) throw new GameError(st.reason);
  if (d.powertrain === 'electric' && !electricAvailable(s)) throw new GameError('Research Electric Power to level 3 first.');
  const nums = designNumbers(s, d);
  if (s.money < nums.devCost) throw new GameError(`Not enough money. Development costs ${money(nums.devCost)}.`);
  if (d.price <= 0) throw new GameError('Set a price.');
  const prev = d.lineOf ? s.cars.find((c) => c.id === d.lineOf) : undefined;
  if (prev && s.cars.some((c) => c.status === 'development' && c.name === prev.name)) {
    throw new GameError(`The next ${prev.name} is already in development.`);
  }
  const name = (prev?.name ?? d.name).trim() || 'Model 1';
  if (!prev && s.cars.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.status !== 'retired')) {
    throw new GameError(`You already have a car called ${name}.`);
  }
  s.money -= nums.devCost;
  const car: CarModel = {
    id: uid('c'), name, generation: prev ? prev.generation + 1 : 1, segment: d.segment, powertrain: d.powertrain,
    focus: { ...d.focus }, stats: nums.stats, price: roundPrice(d.price), unitCost: nums.unitCost,
    status: 'development', devQuartersLeft: nums.devQuarters, launchedAt: null, unitsSold: 0, unitsLastQuarter: 0,
    revenue: 0, profit: -nums.devCost,
    lineReputation: prev ? Math.max(prev.lineReputation * 0.5, prev.reputation) : 0,
    reputation: 0, legendary: false, salesByRegion: {}, quartersInProduction: 0, devCost: nums.devCost,
  };
  s.cars.push(car);
  addNews(s, `Development begins on the ${carTitle(car)}.`, 'neutral');
  return s;
}

export function carTitle(c: Pick<CarModel, 'name' | 'generation' | 'powertrain'>) {
  const gen = c.generation > 1 ? ` Mk${c.generation}` : '';
  return `${c.name}${gen}${c.powertrain === 'electric' ? ' EV' : ''}`;
}

export function setCarPrice(state: GameState, carId: string, price: number): GameState {
  const s = clone(state);
  const car = s.cars.find((c) => c.id === carId);
  if (!car) throw new GameError('Car not found.');
  car.price = roundPrice(Math.max(1, price));
  return s;
}

export function retireCar(state: GameState, carId: string): GameState {
  const s = clone(state);
  const car = s.cars.find((c) => c.id === carId);
  if (!car || car.status !== 'production') throw new GameError('Only cars in production can be retired.');
  car.status = 'retired';
  addNews(s, `Production of the ${carTitle(car)} ends after ${car.unitsSold.toLocaleString()} cars.`, 'neutral');
  return s;
}

export function cancelDesign(state: GameState, carId: string): GameState {
  const s = clone(state);
  const idx = s.cars.findIndex((c) => c.id === carId && c.status === 'development');
  if (idx < 0) throw new GameError('Nothing to cancel.');
  s.cars.splice(idx, 1);
  return s;
}

export function maxEngineers(s: GameState) {
  return FACTORIES[s.factoryLevel].maxEngineers;
}

export function hireEngineers(state: GameState, n: number): GameState {
  const s = clone(state);
  const room = maxEngineers(s) - s.engineers;
  if (room <= 0) throw new GameError('No room for more engineers. Upgrade your factory.');
  const count = Math.min(n, room);
  const cost = count * ENGINEER_HIRE_FEE;
  if (s.money < cost) throw new GameError(`Hiring costs ${money(cost)}.`);
  s.money -= cost;
  s.engineers += count;
  return s;
}

export function fireEngineers(state: GameState, n: number): GameState {
  const s = clone(state);
  s.engineers = Math.max(1, s.engineers - n);
  return s;
}

export function setResearchFocus(state: GameState, area: TechArea): GameState {
  const s = clone(state);
  if (TECH_INFO[area].unlockYear > yearOf(s.quarter)) throw new GameError(`${TECH_INFO[area].name} research opens in ${TECH_INFO[area].unlockYear}.`);
  if (s.tech[area] >= MAX_TECH) throw new GameError('Already at maximum level.');
  s.researchFocus = area;
  return s;
}

export function setResearchSpending(state: GameState, lvl: 0 | 1 | 2 | 3): GameState {
  return { ...clone(state), researchSpending: lvl };
}

export function setMarketing(state: GameState, lvl: 0 | 1 | 2 | 3): GameState {
  return { ...clone(state), marketingLevel: lvl };
}

export function marketingCost(s: GameState, lvl = s.marketingLevel) {
  const lastRev = s.reports[0]?.revenue ?? 0;
  return lvl * Math.round(Math.max(15000, lastRev * 0.03));
}

export function researchPoints(s: GameState) {
  let rp = 10 * Math.pow(s.engineers, 0.85) * (1 + 0.5 * s.researchSpending);
  if (s.company.philosophy === 'innovation') rp *= 1.25;
  return Math.round(rp);
}

export function upgradeFactory(state: GameState): GameState {
  const s = clone(state);
  const next = FACTORIES[s.factoryLevel + 1];
  if (!next) throw new GameError('Your factories are already the biggest in the world.');
  if (s.money < next.cost) throw new GameError(`Upgrading costs ${money(next.cost)}.`);
  s.money -= next.cost;
  s.factoryLevel += 1;
  addNews(s, `New facility opened: ${next.name}. Capacity is now ${next.capacity.toLocaleString()} cars per quarter.`, 'good');
  return s;
}

export function factoryUpkeep(s: GameState) {
  const built = FACTORIES.slice(0, s.factoryLevel + 1).reduce((a, f) => a + f.cost, 0);
  return Math.round(5000 + built * 0.012);
}

export function regionStatus(s: GameState, r: RegionId): { ok: boolean; reason?: string } {
  const def = REGION_MAP[r];
  if (s.regions.includes(r)) return { ok: false, reason: 'Already selling here' };
  if (def.unlockYear > yearOf(s.quarter)) return { ok: false, reason: `Opens in ${def.unlockYear}` };
  if (s.factoryLevel < 2) return { ok: false, reason: 'Needs a Regional Plant (factory level 3)' };
  return { ok: true };
}

export function enterRegion(state: GameState, r: RegionId): GameState {
  const s = clone(state);
  const st = regionStatus(s, r);
  if (!st.ok) throw new GameError(st.reason);
  const cost = REGION_MAP[r].entryCost;
  if (s.money < cost) throw new GameError(`Setting up dealers costs ${money(cost)}.`);
  s.money -= cost;
  s.regions.push(r);
  addNews(s, `${s.company.name} cars are now on sale in ${REGION_MAP[r].name}!`, 'good');
  return s;
}

export function repayLoan(state: GameState, amount: number): GameState {
  const s = clone(state);
  const pay = Math.min(amount, s.loanBalance, s.money);
  if (pay <= 0) throw new GameError('Nothing to repay.');
  s.money -= pay;
  s.loanBalance -= pay;
  return s;
}

export function loanLimit(s: GameState) {
  const yearRevenue = s.reports.slice(0, 4).reduce((a, r) => a + r.revenue, 0);
  return Math.round(1_000_000 + yearRevenue * 0.5);
}

// ---------- Acquisitions ----------
export function acquisitionPrice(s: GameState, r: Rival) {
  const year = yearOf(s.quarter);
  const base = 300_000_000 + r.prestige * r.prestige * 1_500_000 + r.tech * 80_000_000;
  return Math.round((base * (r.wealth < 0 ? 0.6 : 1) * (1 + (year - START_YEAR) * 0.02)) / 1e6) * 1e6;
}

export function acquisitionStatus(s: GameState, r: Rival): { ok: boolean; reason?: string } {
  if (r.owned) return { ok: false, reason: 'Already part of your group' };
  if (!r.alive) return { ok: false, reason: 'No longer trading' };
  if (s.prestige < r.prestige - 15) return { ok: false, reason: `Their board won't sell to a brand below ${Math.ceil(r.prestige - 15)} prestige` };
  return { ok: true };
}

export function acquireRival(state: GameState, rivalId: string): GameState {
  const s = clone(state);
  const r = s.rivals.find((x) => x.id === rivalId);
  if (!r) throw new GameError('Company not found.');
  const st = acquisitionStatus(s, r);
  if (!st.ok) throw new GameError(st.reason);
  const price = acquisitionPrice(s, r);
  if (s.money < price) throw new GameError(`${r.name} would cost ${money(price)}.`);
  s.money -= price;
  r.owned = true;
  r.alive = false;
  r.purchasePrice = price;
  addPrestige(s, r.prestige * 0.05);
  addNews(s, `🤝 ${s.company.name} acquires ${r.name} for ${money(price)}. Their profits now flow to the group.`, 'good');
  unlock(s, 'group');
  if (s.rivals.filter((x) => x.owned).length >= 3) unlock(s, 'empire');
  return s;
}

export function brandIncome(s: GameState) {
  return s.rivals.filter((r) => r.owned).reduce((a, r) => a + Math.round((r.purchasePrice ?? 0) * 0.022), 0);
}

// ---------- Racing actions ----------
export function tierStatus(s: GameState, t: number): { ok: boolean; reason?: string } {
  const def = TIERS[t];
  if (t > s.racing.unlockedTier) return { ok: false, reason: `Finish top 3 in ${TIERS[t - 1].name} first` };
  if (s.prestige < def.minPrestige) return { ok: false, reason: `Needs ${def.minPrestige} prestige` };
  if (def.requiresElectric && s.tech.electric < def.requiresElectric) return { ok: false, reason: `Needs Electric Power level ${def.requiresElectric}` };
  return { ok: true };
}

export function chooseSeries(state: GameState, t: number | null): GameState {
  const s = clone(state);
  if (t !== null) {
    const st = tierStatus(s, t);
    if (!st.ok) throw new GameError(st.reason);
    if (s.racing.pendingTier !== t) {
      const rng = makeRng(s);
      s.racing.sponsorOffers = makeSponsorOffers(rng, s, t);
    }
  }
  s.racing.pendingTier = t;
  return s;
}

export function signDriver(state: GameState, driverId: string): GameState {
  const s = clone(state);
  const d = s.drivers.find((x) => x.id === driverId);
  if (!d) throw new GameError('Driver not found.');
  if (s.prestige < d.minPrestige) throw new GameError(`${d.name} won't drive for a brand with less than ${d.minPrestige} prestige.`);
  const fee = d.salary * 2;
  if (s.money < fee) throw new GameError(`Signing fee is ${money(fee)}.`);
  s.money -= fee;
  s.racing.driverId = d.id;
  addNews(s, `${d.nationality} ${d.name} signs to drive for ${s.company.name}.`, 'race');
  return s;
}

export function releaseDriver(state: GameState): GameState {
  const s = clone(state);
  s.racing.driverId = null;
  return s;
}

export function setRaceDev(state: GameState, lvl: 0 | 1 | 2 | 3): GameState {
  const s = clone(state);
  s.racing.devLevel = lvl;
  return s;
}

export function raceDevCost(s: GameState, lvl = s.racing.devLevel) {
  const t = s.racing.tier ?? s.racing.pendingTier;
  if (t === null) return 0;
  return Math.round(lvl * TIERS[t].seasonCost * 0.06);
}

export function acceptSponsor(state: GameState, id: string): GameState {
  const s = clone(state);
  if (s.racing.sponsors.length >= 2) throw new GameError('You can carry two sponsors at once.');
  const idx = s.racing.sponsorOffers.findIndex((o) => o.id === id);
  if (idx < 0) throw new GameError('Offer no longer available.');
  const [sp] = s.racing.sponsorOffers.splice(idx, 1);
  s.racing.sponsors.push(sp);
  addNews(s, `${sp.name} becomes an official partner (${money(sp.paymentPerQuarter)} per quarter).`, 'good');
  return s;
}

export function currentDriver(s: GameState) {
  return s.drivers.find((d) => d.id === s.racing.driverId) ?? null;
}

export function raceCarBase(s: GameState, tier: number | null) {
  const t = s.tech;
  const power = tier !== null && TIERS[tier].requiresElectric ? t.electric : t.engine;
  let base = 18 + ((power + t.chassis + t.electronics) / 3) * 6;
  if (s.company.philosophy === 'motorsport') base += 4;
  return base;
}

export function raceCarRating(s: GameState) {
  return Math.round(raceCarBase(s, s.racing.tier ?? s.racing.pendingTier) + s.racing.devBonus);
}

function makeSponsorOffers(rng: Rng, s: GameState, tier: number): Sponsor[] {
  const def = TIERS[tier];
  const level = s.prestige >= 60 && tier >= 6 ? 2 : s.prestige >= 28 ? 1 : 0;
  const avgTech = TECH_AREAS.reduce((a, k) => a + s.tech[k], 0) / TECH_AREAS.length;
  const kinds: Sponsor['kind'][] = ['luxury', 'tech', 'consumer'];
  return kinds.map((kind) => {
    const rel = s.racing.sponsorRelations[kind];
    const kindFactor = kind === 'luxury' ? clamp(s.prestige / 40, 0.4, 2) : kind === 'tech' ? clamp(avgTech / 4, 0.4, 2) : clamp(s.awareness / 40, 0.4, 2);
    const pay = (def.seasonCost / 4) * rng.range(0.15, 0.32) * (1 + rel / 100) * [1, 1.3, 1.7][level] * kindFactor;
    let objective: Sponsor['objective'];
    if (kind === 'luxury') objective = rng.next() < 0.5 ? { type: 'prestige', value: Math.ceil(s.prestige + 2) } : { type: 'championshipTop', position: rng.pick([3, 5]) };
    else if (kind === 'tech') objective = rng.next() < 0.5 ? { type: 'wins', count: rng.int(1, 2) } : { type: 'championshipTop', position: rng.pick([5, 8]) };
    else objective = { type: 'podiums', count: rng.int(1, 4) };
    const paymentPerQuarter = Math.round(pay / 1000) * 1000;
    return {
      id: uid('s'), name: rng.pick(SPONSOR_NAMES[kind][level]), kind, paymentPerQuarter,
      objective, bonus: paymentPerQuarter * 2, seasonsLeft: 1,
    };
  });
}

export function objectiveText(o: Sponsor['objective']) {
  switch (o.type) {
    case 'championshipTop': return `Finish top ${o.position} in the championship`;
    case 'wins': return `Win ${o.count} race${o.count > 1 ? 's' : ''}`;
    case 'podiums': return `Score ${o.count} podium${o.count > 1 ? 's' : ''}`;
    case 'prestige': return `Reach ${o.value} prestige`;
  }
}

// ---------- Quarter simulation ----------

function startSeason(s: GameState, rng: Rng) {
  const r = s.racing;
  const year = yearOf(s.quarter);
  // carry half of last year's development into the new car
  r.devBonus = r.devBonus * 0.5;
  if (r.pendingTier === null) {
    r.tier = null;
    r.season = null;
    return;
  }
  const t = r.pendingTier;
  const st = tierStatus(s, t);
  const driver = currentDriver(s);
  if (!st.ok || !driver) {
    addNews(s, `Your ${TIERS[t].name} entry was withdrawn: ${!driver ? 'no driver signed' : st.reason}.`, 'bad');
    r.tier = null;
    r.season = null;
    return;
  }
  if (r.tier !== t) r.devBonus = 0;
  r.tier = t;
  const def = TIERS[t];
  const entrants: Entrant[] = [];
  const rivalTeams = s.rivals.filter((x) => x.alive && x.prestige >= 25 + t * 4).map((x) => `${x.name} Racing`);
  const names = [...rivalTeams, ...AI_TEAMS].slice(0, def.fieldSize + 4);
  const pool = names.sort(() => rng.next() - 0.5);
  for (let i = 0; i < def.fieldSize - 1; i++) {
    const strength = rng.gauss();
    entrants.push({
      id: `ai${i}`, team: pool[i % pool.length], driver: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      carRating: def.fieldAvg + strength * 4.5, driverSkill: clamp(def.fieldAvg + strength * 3 + rng.gauss() * 5, 20, 99),
      isPlayer: false, points: 0, wins: 0, podiums: 0,
    });
  }
  entrants.push({
    id: 'player', team: s.company.name, driver: driver.name, carRating: raceCarRating(s), driverSkill: driver.skill,
    isPlayer: true, points: 0, wins: 0, podiums: 0,
  });
  r.season = { year, tier: t, entrants, results: [], roundsDone: 0, totalRounds: def.rounds };
  if (!s.achievements.includes('firstRace')) unlock(s, 'firstRace');
  if (t === 10) unlock(s, 'f1');
  addNews(s, `The ${year} ${def.name} season begins. ${s.company.name} lines up with ${driver.name}.`, 'race');
}

function runRaces(s: GameState, rng: Rng, report: QuarterReport) {
  const r = s.racing;
  const season = r.season;
  if (!season || r.tier === null) return;
  const def = TIERS[r.tier];
  const driver = currentDriver(s);
  const qi = quarterOf(s.quarter) - 1;
  const rounds = Math.floor(((qi + 1) * def.rounds) / 4) - Math.floor((qi * def.rounds) / 4);
  const fan = driver?.traits.includes('fanFavourite') ? 1.5 : 1;

  // development during the quarter
  const devMult = driver?.traits.includes('developer') ? 1.5 : 1;
  r.devBonus += r.devLevel * 1.6 * devMult;
  for (const e of season.entrants) {
    if (e.isPlayer) {
      e.carRating = raceCarRating(s);
      if (driver) e.driverSkill = driver.skill;
    } else e.carRating += rng.range(0, 1.3);
  }

  for (let i = 0; i < rounds; i++) {
    const round = season.roundsDone + 1;
    const wet = rng.next() < 0.25;
    const scored: { id: string; score: number }[] = [];
    const dnf: string[] = [];
    for (const e of season.entrants) {
      let sigma = 5;
      let dnfChance = 0.05;
      let perf = 0.6 * e.carRating + 0.4 * e.driverSkill;
      if (e.isPlayer && driver) {
        if (driver.traits.includes('consistent')) { sigma = 3.5; dnfChance *= 0.5; }
        if (driver.traits.includes('qualifier')) perf += 1.5;
        if (wet && driver.traits.includes('wet')) perf += 4;
        dnfChance = Math.max(0.02, dnfChance + 0.03 - s.tech.manufacturing * 0.004);
      } else if (wet) perf += rng.gauss() * 2;
      if (rng.next() < dnfChance) { dnf.push(e.id); continue; }
      scored.push({ id: e.id, score: perf + rng.gauss() * sigma });
    }
    scored.sort((a, b) => b.score - a.score);
    const order = scored.map((x) => x.id);
    order.forEach((id, pos) => {
      const e = season.entrants.find((x) => x.id === id)!;
      e.points += POINTS[pos] ?? 0;
      if (pos === 0) e.wins++;
      if (pos < 3) e.podiums++;
    });
    const venue = RACE_VENUES[(round * 7 + season.year) % RACE_VENUES.length];
    season.results.push({ round, name: venue, wet, order, dnf });
    season.roundsDone = round;

    // player consequences
    const pos = order.indexOf('player');
    const tierFactor = 1 + r.tier * 0.15;
    if (pos === 0) {
      addPrestige(s, (0.25 + r.tier * 0.06) * fan);
      s.awareness += 0.8 * tierFactor * fan;
      s.money += def.prizePerWin;
      report.prizeMoney += def.prizePerWin;
      if (driver) driver.wins++;
      unlock(s, 'firstWin');
      addNews(s, `🏆 VICTORY! ${driver?.name} wins the ${venue} ${def.short} round${wet ? ' in the rain' : ''}!`, 'race');
    } else if (pos > 0 && pos < 3) {
      addPrestige(s, (0.12 + r.tier * 0.03) * fan);
      s.awareness += 0.4 * tierFactor * fan;
      addNews(s, `${driver?.name} takes P${pos + 1} at ${venue}.`, 'race');
    } else if (pos >= 3 && pos < 10) {
      addPrestige(s, 0.02);
      addNews(s, `${driver?.name} finishes P${pos + 1} at ${venue}.`, 'race');
    } else if (pos < 0) {
      addPrestige(s, -(0.05));
      addNews(s, `Retirement at ${venue}. ${driver?.name} is out of the race.`, 'bad');
    } else {
      addPrestige(s, -(0.03));
      addNews(s, `A tough day at ${venue}: P${pos + 1} for ${driver?.name}.`, 'race');
    }
  }
}

export function standings(entrants: Entrant[]) {
  return [...entrants].sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);
}

function endSeason(s: GameState, rng: Rng, report: QuarterReport) {
  const r = s.racing;
  const season = r.season;
  if (season && r.tier !== null) {
    const def = TIERS[r.tier];
    const table = standings(season.entrants);
    const pos = table.findIndex((e) => e.isPlayer) + 1;
    const me = table[pos - 1];
    const driver = currentDriver(s);
    const fan = driver?.traits.includes('fanFavourite') ? 1.3 : 1;
    const prize = Math.round(def.prizePerWin * 3 * ((def.fieldSize - pos + 1) / def.fieldSize));
    s.money += prize;
    report.prizeMoney += prize;
    if (pos === 1) {
      addPrestige(s, def.titlePrestige * fan);
      s.awareness += 3 + r.tier;
      r.titles++;
      if (driver) driver.titles++;
      unlock(s, 'firstTitle');
      if (r.tier === 10) unlock(s, 'f1Title');
      addNews(s, `🏆 CHAMPIONS! ${s.company.name} wins the ${season.year} ${def.name} title!`, 'good');
    } else if (pos <= 3) {
      addPrestige(s, def.titlePrestige * (pos === 2 ? 0.4 : 0.25) * fan);
      addNews(s, `${s.company.name} finishes P${pos} in the ${season.year} ${def.name} championship.`, 'race');
    } else if (pos > def.fieldSize * 0.75) {
      addPrestige(s, -(def.titlePrestige * 0.15));
      addNews(s, `A season to forget: P${pos} of ${def.fieldSize} in ${def.name}.`, 'bad');
    } else {
      addNews(s, `${s.company.name} ends the ${def.name} season in P${pos}.`, 'race');
    }
    if (pos <= 3 && r.tier < TIERS.length - 1 && r.unlockedTier <= r.tier) {
      r.unlockedTier = r.tier + 1;
      addNews(s, `${TIERS[r.tier + 1].name} is now open to ${s.company.name}.`, 'good');
    }
    r.history.unshift({ year: season.year, tier: r.tier, position: pos, wins: me.wins });

    // sponsors
    for (const sp of r.sponsors) {
      const o = sp.objective;
      const met =
        (o.type === 'championshipTop' && pos <= o.position) ||
        (o.type === 'wins' && me.wins >= o.count) ||
        (o.type === 'podiums' && me.podiums >= o.count) ||
        (o.type === 'prestige' && s.prestige >= o.value);
      if (met) {
        s.money += sp.bonus;
        report.sponsorIncome += sp.bonus;
        r.sponsorRelations[sp.kind] = clamp(r.sponsorRelations[sp.kind] + 15, -50, 100);
        addNews(s, `${sp.name} is delighted: objective met, ${money(sp.bonus)} bonus paid.`, 'good');
      } else {
        r.sponsorRelations[sp.kind] = clamp(r.sponsorRelations[sp.kind] - 10, -50, 100);
        addNews(s, `${sp.name} is disappointed. Objective missed.`, 'bad');
      }
      sp.seasonsLeft--;
    }
  }
  r.sponsors = r.sponsors.filter((x) => x.seasonsLeft > 0);

  // drivers age and develop
  const driverId = r.driverId;
  for (const d of s.drivers) {
    d.age++;
    if (d.age <= 26) d.skill = Math.min(99, d.skill + rng.int(1, 4));
    else if (d.age >= 33) d.skill = Math.max(15, d.skill - rng.int(1, 3));
    d.salary = driverSalary(d.skill, d.traits);
    d.minPrestige = Math.max(0, Math.round((d.skill - 48) * 1.15));
  }
  const retiring = s.drivers.filter((d) => d.age >= 39 || (d.age >= 35 && rng.next() < 0.2));
  for (const d of retiring) {
    if (d.id === driverId) {
      addNews(s, `${d.name} retires after ${d.wins} wins with the team. A legend of the brand.`, 'race');
      r.driverId = null;
      addPrestige(s, Math.min(3, d.wins * 0.1 + d.titles));
    }
  }
  s.drivers = s.drivers.filter((d) => !retiring.includes(d) || d.id === r.driverId);
  while (s.drivers.length < 30) s.drivers.push(makeDriver(rng, s));

  const nextTier = r.pendingTier;
  if (nextTier !== null) s.racing.sponsorOffers = makeSponsorOffers(rng, s, nextTier);
}

function updateRivals(s: GameState, rng: Rng, playerShareBySeg: Map<SegmentId, number>) {
  const year = yearOf(s.quarter);
  for (const r of s.rivals) {
    if (!r.alive) {
      if (!r.owned && r.foundedYear === year && quarterOf(s.quarter) === 1 && r.wealth > 0) {
        r.alive = true;
        addNews(s, `New rival: ${r.name} enters the car business.`, 'neutral');
      }
      continue;
    }
    const growth = r.region === 'china' ? 0.16 : 0.1;
    r.tech = Math.min(11, r.tech + growth * rng.range(0.6, 1.4) * (r.wealth > 30 ? 1 : 0.6));
    const pressure = r.segments.reduce((a, seg) => a + (playerShareBySeg.get(seg) ?? 0), 0) / r.segments.length;
    r.wealth += rng.gauss() * 3 + 0.8 - pressure * 6;
    r.wealth = Math.min(150, r.wealth);
    r.prestige = clamp(r.prestige + rng.gauss() * 0.4 + (r.wealth < 0 ? -0.3 : 0.03), 5, 95);
    r.marketShare = 1 - pressure;
    if (r.wealth < -80) {
      r.alive = false;
      addNews(s, `💥 ${r.name} has gone bankrupt and closes its factories.`, 'neutral');
    } else if (r.wealth < -40 && rng.next() < 0.1) {
      addNews(s, `${r.name} announces job cuts amid falling sales.`, 'neutral');
    }
  }
}

const WORLD_EVENTS: Record<number, string> = {
  1979: '⛽ Oil crisis! Fuel prices soar and buyers want efficient cars.',
  1987: 'Fuel prices settle. Power is back in fashion.',
  1990: '🔋 Battery breakthroughs make Electric Power research possible.',
  1992: 'Safety ratings now drive buying decisions. Luxury and safety matter more.',
  1995: '🇨🇳 China opens its car market to foreign brands.',
  2000: 'The SUV boom is accelerating, especially in North America.',
  2008: '📉 Financial crisis: car demand falls sharply for two years.',
  2012: 'Early electric cars are winning over tech-savvy buyers.',
  2020: '😷 A pandemic hits car demand this year.',
  2021: 'Europe confirms plans to phase out new petrol cars by 2035. China will follow.',
  2030: 'Electric cars now outsell petrol in many markets.',
};

function unlock(s: GameState, id: string) {
  if (s.achievements.includes(id)) return;
  s.achievements.push(id);
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (a) addNews(s, `🏅 Achievement unlocked: ${a.name}`, 'good');
}

export function advanceQuarter(state: GameState): GameState {
  if (state.gameOver) return state;
  const s = clone(state);
  const rng = makeRng(s);
  const year = yearOf(s.quarter);
  const qn = quarterOf(s.quarter);
  const report: QuarterReport = {
    q: s.quarter, revenue: 0, carCosts: 0, salaries: 0, research: 0, marketing: 0, factory: 0, racing: 0,
    sponsorIncome: 0, prizeMoney: 0, brandIncome: 0, unitsSold: 0, profit: 0,
  };
  const moneyBefore = s.money;

  if (qn === 1 && WORLD_EVENTS[year]) addNews(s, WORLD_EVENTS[year], 'neutral');

  // 1. car development & launches
  for (const car of s.cars) {
    if (car.status !== 'development') continue;
    car.devQuartersLeft--;
    if (car.devQuartersLeft <= 0) {
      car.status = 'production';
      car.launchedAt = s.quarter;
      const prev = s.cars.find((c) => c.status === 'production' && c.name === car.name && c.id !== car.id);
      if (prev) {
        prev.status = 'retired';
        addNews(s, `The new ${carTitle(car)} replaces the outgoing model.`, 'good');
      } else addNews(s, `🚀 The ${carTitle(car)} is launched!`, 'good');
      unlock(s, 'firstCar');
      if (car.segment === 'sports') unlock(s, 'sportsCar');
      if (car.segment === 'supercar' || car.segment === 'hypercar') unlock(s, 'supercar');
      if (car.powertrain === 'electric') unlock(s, 'ev');
    }
  }

  // 2. sales
  const active = s.cars.filter((c) => c.status === 'production');
  const { perCar, shares } = computeDemand(s, active);
  const totalDemand = active.reduce((a, c) => a + Object.values(perCar.get(c.id) ?? {}).reduce((x, y) => x + (y ?? 0), 0), 0);
  const cap = capacity(s);
  const fill = totalDemand > cap ? cap / totalDemand : 1;
  let unitsTotal = 0;
  let productPrestige = 0;
  const playerShareBySeg = new Map<SegmentId, number>();
  for (const [key, share] of shares) {
    const seg = key.split(':')[0] as SegmentId;
    playerShareBySeg.set(seg, Math.max(playerShareBySeg.get(seg) ?? 0, share * fill));
  }
  for (const car of active) {
    const byRegion = perCar.get(car.id) ?? {};
    let units = 0;
    car.salesByRegion = {};
    for (const [reg, d] of Object.entries(byRegion) as [RegionId, number][]) {
      const u = Math.floor(d * fill);
      car.salesByRegion[reg] = u;
      units += u;
    }
    const revenue = units * car.price;
    const cost = units * car.unitCost;
    car.unitsSold += units;
    car.unitsLastQuarter = units;
    car.revenueLastQuarter = revenue;
    car.profitLastQuarter = revenue - cost;
    car.salesHistory = [...(car.salesHistory ?? []), units].slice(-12);
    car.revenue += revenue;
    car.profit += revenue - cost;
    car.quartersInProduction++;
    report.revenue += revenue;
    report.carCosts += cost;
    unitsTotal += units;

    // reputation
    const q = qualityOf(car.stats, car.segment, s.company.homeRegion, year);
    const valueScore = clamp(60 - (car.price / SEGMENT_MAP[car.segment].refPrice - 1) * 40, 20, 80);
    const target = clamp(q * 0.75 + valueScore * 0.25 + (units > 0 ? 5 : 0), 0, 100);
    car.reputation += (target - car.reputation) * 0.15;
    const def = SEGMENT_MAP[car.segment];
    if (!car.legendary && car.reputation >= 72 && car.unitsSold >= def.baseDemand * 0.25) {
      car.legendary = true;
      addPrestige(s, 3 * Math.min(1.3, def.prestigeSens + 0.3));
      unlock(s, 'legend');
      addNews(s, `🌟 The ${carTitle(car)} is hailed as a legend! It will define ${s.company.name} for years.`, 'good');
    }
    // prestige from product quality
    const marketQ = averageRivalQuality(s, car.segment, s.company.homeRegion, year);
    productPrestige += clamp(((q - marketQ) / 100) * 0.5 * def.prestigeSens, -0.15, 0.2);
    // flops
    if (car.quartersInProduction === 6 && car.profit < 0) {
      addPrestige(s, -(1));
      addNews(s, `The ${carTitle(car)} is branded an expensive flop by the press.`, 'bad');
    }
    // recalls
    if (car.stats.reliability < 35 && rng.next() < (35 - car.stats.reliability) / 600) {
      const recall = Math.round(car.unitsSold * car.unitCost * 0.04);
      s.money -= recall;
      report.carCosts += recall;
      addPrestige(s, -(1.5));
      addNews(s, `⚠️ Recall! The ${carTitle(car)} has a fault. Repairs cost ${money(recall)}.`, 'bad');
    }
  }
  addPrestige(s, clamp(productPrestige, -0.5, 0.3));
  report.unitsSold = unitsTotal;
  report.demand = Math.round(totalDemand);
  s.money += report.revenue - report.carCosts;
  if (fill < 0.98 && active.length) {
    if (rng.next() < 0.35) addNews(s, `Waiting lists grow: demand is ${Math.round(totalDemand).toLocaleString()} cars but the factory makes ${cap.toLocaleString()}.`, 'neutral');
  }

  // 3. research
  const rp = researchPoints(s);
  report.research = s.researchSpending * s.engineers * LAB_COST_PER_ENGINEER;
  const area = s.researchFocus;
  if (s.tech[area] < MAX_TECH && TECH_INFO[area].unlockYear <= year) {
    s.researchProgress[area] += rp;
    const need = techLevelCost(s.tech[area]);
    if (s.researchProgress[area] >= need) {
      s.researchProgress[area] -= need;
      s.tech[area]++;
      addPrestige(s, 0.1 + s.tech[area] * 0.03);
      addNews(s, `🔬 Breakthrough: ${TECH_INFO[area].name} reaches level ${s.tech[area]}.`, 'good');
      if (s.tech[area] >= MAX_TECH) {
        const nextArea = TECH_AREAS.find((a) => s.tech[a] < MAX_TECH && TECH_INFO[a].unlockYear <= year);
        if (nextArea) s.researchFocus = nextArea;
      }
    }
  }

  // 4. racing
  if (qn === 1) startSeason(s, rng);
  runRaces(s, rng, report);
  if (s.racing.tier !== null) {
    report.racing += TIERS[s.racing.tier].seasonCost / 4 + raceDevCost(s);
    const d = currentDriver(s);
    if (d) report.racing += d.salary;
    const pay = s.racing.sponsors.reduce((a, sp) => a + sp.paymentPerQuarter, 0);
    report.sponsorIncome += pay;
    s.money += pay;
  }
  if (qn === 4) endSeason(s, rng, report);

  // 5. expenses
  report.salaries = s.engineers * ENGINEER_SALARY;
  report.marketing = marketingCost(s);
  report.factory = factoryUpkeep(s);
  const interest = Math.round(s.loanBalance * 0.025);
  report.brandIncome = brandIncome(s);
  s.money += report.brandIncome;
  s.money -= report.salaries + report.research + report.marketing + report.factory + report.racing + interest;

  // 6. brand
  s.awareness += s.marketingLevel * 2.5 * (1 - s.awareness / 100) + Math.log10(1 + unitsTotal) * 0.35;
  s.awareness -= s.awareness * 0.015;
  s.awareness = clamp(Math.max(s.awareness, s.prestige * 0.6), 0, 100);
  addPrestige(s, s.marketingLevel * 0.05);
  addPrestige(s, -(s.prestige * 0.008));
  s.prestige = clamp(s.prestige, 0, 100);

  // 7. rivals
  updateRivals(s, rng, playerShareBySeg);

  // 8. finances: automatic loans and bankruptcy
  if (s.money < 0) {
    const limit = loanLimit(s);
    const need = -s.money;
    if (s.loanBalance + need <= limit) {
      s.loanBalance += need;
      s.money = 0;
      addNews(s, `The bank covers a ${money(need)} shortfall. Loan balance: ${money(s.loanBalance)}.`, 'bad');
    } else {
      s.gameOver = true;
      addNews(s, `${s.company.name} has run out of money and credit. The company is bankrupt.`, 'bad');
    }
  }

  report.profit = s.money - moneyBefore;
  s.reports.unshift(report);
  if (s.reports.length > 40) s.reports.length = 40;

  // 9. achievements
  if (s.money >= 1_000_000) unlock(s, 'million');
  if (s.money >= 1_000_000_000) unlock(s, 'billion');
  if (s.regions.length >= 2) unlock(s, 'newMarket');
  if (REGIONS.every((r) => s.regions.includes(r.id))) unlock(s, 'global');
  if (s.prestige >= 50) unlock(s, 'prestige50');
  if (s.prestige >= 90) unlock(s, 'prestige90');
  if (s.cars.reduce((a, c) => a + c.unitsSold, 0) >= 1_000_000) unlock(s, 'millionCars');

  s.quarter++;
  return s;
}

// ---------- helpers for UI ----------
export function money(v: number) {
  const neg = v < 0;
  const a = Math.abs(v);
  const str = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M` : a >= 1e4 ? `${Math.round(a / 1000)}K` : Math.round(a).toLocaleString();
  return `${neg ? '-' : ''}$${str}`;
}

/** Exact dollar amount, for prices. */
export function price(v: number) {
  if (Math.abs(v) >= 1e6) return money(v);
  return `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
}

export function marketShareSummary(s: GameState) {
  const active = s.cars.filter((c) => c.status === 'production');
  return computeDemand(s, active).shares;
}

export function companyValue(s: GameState) {
  const yearProfit = s.reports.slice(0, 4).reduce((a, r) => a + r.profit, 0);
  const factories = FACTORIES.slice(0, s.factoryLevel + 1).reduce((a, f) => a + f.cost, 0);
  return Math.max(0, s.money - s.loanBalance + factories * 0.6 + Math.max(0, yearProfit) * 6 + s.prestige * s.prestige * 20000);
}
