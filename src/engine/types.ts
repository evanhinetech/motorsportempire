// Core data types for the Motorsport Empire simulation.
// The engine is pure TypeScript with no React Native imports, so it can be
// unit-tested and balanced headlessly (see scripts/simulate.ts).

export type Philosophy =
  | 'performance'
  | 'reliability'
  | 'luxury'
  | 'value'
  | 'innovation'
  | 'motorsport';

export type RegionId = 'europe' | 'northAmerica' | 'japan' | 'china' | 'restOfWorld';

export type TechArea =
  | 'engine'
  | 'chassis'
  | 'comfort'
  | 'electronics'
  | 'manufacturing'
  | 'electric';

export type StatKey = 'performance' | 'efficiency' | 'comfort' | 'technology' | 'reliability';

export type Stats = Record<StatKey, number>;

export type SegmentId =
  | 'economy'
  | 'hatchback'
  | 'sedan'
  | 'suv'
  | 'truck'
  | 'sports'
  | 'supercar'
  | 'hypercar'
  | 'commercial';

export type Powertrain = 'petrol' | 'electric';

export interface CarModel {
  id: string;
  name: string; // model line name, e.g. "Vortex"
  generation: number;
  segment: SegmentId;
  powertrain: Powertrain;
  focus: Stats; // design sliders 0-100
  stats: Stats; // resulting stats 0-100
  price: number;
  unitCost: number;
  status: 'development' | 'production' | 'retired';
  devQuartersLeft: number;
  launchedAt: number | null; // absolute quarter index
  unitsSold: number;
  unitsLastQuarter: number;
  revenue: number;
  profit: number;
  lineReputation: number; // inherited from previous generations, 0-100
  reputation: number; // this model's reputation, 0-100
  legendary: boolean;
  salesByRegion: Partial<Record<RegionId, number>>;
  quartersInProduction: number;
}

export interface Driver {
  id: string;
  name: string;
  nationality: string;
  age: number;
  skill: number; // 0-100
  traits: DriverTrait[];
  popularity: number; // 0-100
  salary: number; // per quarter
  minPrestige: number; // brand prestige needed to sign
  wins: number;
  titles: number;
}

export type DriverTrait = 'qualifier' | 'wet' | 'consistent' | 'developer' | 'fanFavourite';

export interface Rival {
  id: string;
  name: string;
  region: RegionId;
  prestige: number;
  tech: number; // general tech level, ~1-10 continuous
  wealth: number; // abstract health, < 0 means trouble
  segments: SegmentId[];
  focus: 'performance' | 'value' | 'luxury' | 'reliability';
  alive: boolean;
  foundedYear: number;
  marketShare: number; // last quarter, across all segments it sells in
  owned: boolean;
  purchasePrice?: number;
}

export interface Sponsor {
  id: string;
  name: string;
  kind: 'luxury' | 'tech' | 'consumer';
  paymentPerQuarter: number;
  objective: SponsorObjective;
  bonus: number;
  seasonsLeft: number;
}

export type SponsorObjective =
  | { type: 'championshipTop'; position: number }
  | { type: 'wins'; count: number }
  | { type: 'podiums'; count: number }
  | { type: 'prestige'; value: number };

export interface Entrant {
  id: string;
  team: string;
  driver: string;
  carRating: number;
  driverSkill: number;
  isPlayer: boolean;
  points: number;
  wins: number;
  podiums: number;
}

export interface RaceResult {
  round: number;
  name: string;
  wet: boolean;
  order: string[]; // entrant ids in finishing order
  dnf: string[];
}

export interface RacingState {
  tier: number | null; // index into TIERS, null = not racing
  driverId: string | null;
  devBonus: number; // development gained on top of the tech-based baseline
  devLevel: 0 | 1 | 2 | 3;
  season: {
    year: number;
    tier: number;
    entrants: Entrant[];
    results: RaceResult[];
    roundsDone: number;
    totalRounds: number;
  } | null;
  history: { year: number; tier: number; position: number; wins: number }[];
  titles: number;
  unlockedTier: number; // highest tier the team may enter
  sponsors: Sponsor[];
  sponsorOffers: Sponsor[];
  sponsorRelations: Record<'luxury' | 'tech' | 'consumer', number>;
  pendingTier: number | null; // series chosen for next season
}

export interface NewsItem {
  q: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral' | 'race';
}

export interface QuarterReport {
  q: number;
  revenue: number;
  carCosts: number;
  salaries: number;
  research: number;
  marketing: number;
  factory: number;
  racing: number;
  sponsorIncome: number;
  prizeMoney: number;
  brandIncome: number;
  unitsSold: number;
  profit: number;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  company: {
    name: string;
    logo: string; // emoji-like badge glyph
    color: string;
    philosophy: Philosophy;
    homeRegion: RegionId;
    country: string;
  };
  quarter: number; // absolute quarter index, 0 = Q1 of START_YEAR
  money: number;
  prestige: number; // 0-100
  awareness: number; // 0-100 public awareness of the brand
  marketingLevel: 0 | 1 | 2 | 3;
  engineers: number;
  factoryLevel: number;
  regions: RegionId[];
  tech: Record<TechArea, number>; // level, integer 1..10
  researchProgress: Record<TechArea, number>; // points into next level
  researchFocus: TechArea;
  researchSpending: 0 | 1 | 2 | 3;
  cars: CarModel[];
  drivers: Driver[]; // market pool
  rivals: Rival[];
  racing: RacingState;
  news: NewsItem[];
  reports: QuarterReport[];
  achievements: string[];
  loanBalance: number;
  gameOver: boolean;
}
