import type { Philosophy, RegionId, SegmentId, StatKey, Stats, TechArea } from './types';

export const START_YEAR = 1975;
export const SAVE_VERSION = 1;

export const STAT_KEYS: StatKey[] = ['performance', 'efficiency', 'comfort', 'technology', 'reliability'];
export const STAT_LABELS: Record<StatKey, string> = {
  performance: 'Power',
  efficiency: 'Efficiency',
  comfort: 'Luxury',
  technology: 'Technology',
  reliability: 'Reliability',
};

export const TECH_AREAS: TechArea[] = ['engine', 'chassis', 'comfort', 'electronics', 'manufacturing', 'electric'];
export const TECH_INFO: Record<TechArea, { name: string; desc: string; unlockYear: number }> = {
  engine: { name: 'Engines', desc: 'More power for road and race cars.', unlockYear: 0 },
  chassis: { name: 'Chassis & Materials', desc: 'Lightweight materials. Handling, efficiency and race pace.', unlockYear: 0 },
  comfort: { name: 'Interiors & Safety', desc: 'Luxury, comfort and safety systems.', unlockYear: 0 },
  electronics: { name: 'Electronics', desc: 'In-car technology, driver aids and autonomy.', unlockYear: 0 },
  manufacturing: { name: 'Manufacturing', desc: 'Reliability and cheaper production.', unlockYear: 0 },
  electric: { name: 'Electric Power', desc: 'Batteries and electric motors. Unlocks EVs at level 3.', unlockYear: 1990 },
};
export const MAX_TECH = 10;

export function techLevelCost(level: number): number {
  // research points needed to go from `level` to `level + 1`
  return Math.round(100 * Math.pow(2.4, level - 1));
}

export interface SegmentDef {
  id: SegmentId;
  name: string;
  icon: string;
  baseDemand: number; // units per quarter in a region of scale 1.0
  refPrice: number;
  baseCost: number;
  devCost: number;
  devQuarters: number;
  weights: Stats;
  elasticity: number;
  prestigeSens: number;
  requires: Partial<Record<TechArea, number>>;
  requiresPrestige?: number;
  modelNames: string[];
}

export const SEGMENTS: SegmentDef[] = [
  {
    id: 'economy', name: 'Economy', icon: '🚗', baseDemand: 40000, refPrice: 7000, baseCost: 4200,
    devCost: 150_000, devQuarters: 2,
    weights: { performance: 0.1, efficiency: 0.4, comfort: 0.1, technology: 0.05, reliability: 0.35 },
    elasticity: 3, prestigeSens: 0.2, requires: {},
    modelNames: ['Pip', 'Sprite', 'Dot', 'Mini', 'Breeze', 'Polo', 'Spark'],
  },
  {
    id: 'hatchback', name: 'Hatchback', icon: '🚙', baseDemand: 30000, refPrice: 9500, baseCost: 5400,
    devCost: 220_000, devQuarters: 2,
    weights: { performance: 0.2, efficiency: 0.3, comfort: 0.15, technology: 0.1, reliability: 0.25 },
    elasticity: 2.5, prestigeSens: 0.35, requires: {},
    modelNames: ['Swift', 'Dash', 'Vivo', 'Zest', 'Flick', 'Comet'],
  },
  {
    id: 'sedan', name: 'Sedan', icon: '🚘', baseDemand: 25000, refPrice: 15000, baseCost: 8500,
    devCost: 450_000, devQuarters: 3,
    weights: { performance: 0.2, efficiency: 0.2, comfort: 0.3, technology: 0.1, reliability: 0.2 },
    elasticity: 2, prestigeSens: 0.55, requires: { comfort: 2 },
    modelNames: ['Regent', 'Monarch', 'Envoy', 'Senator', 'Avenue', 'Crest'],
  },
  {
    id: 'truck', name: 'Pickup Truck', icon: '🛻', baseDemand: 14000, refPrice: 16000, baseCost: 9500,
    devCost: 500_000, devQuarters: 3,
    weights: { performance: 0.35, efficiency: 0.1, comfort: 0.1, technology: 0.05, reliability: 0.4 },
    elasticity: 2, prestigeSens: 0.3, requires: { engine: 2, chassis: 2 },
    modelNames: ['Ranger', 'Bison', 'Hauler', 'Ridge', 'Titan'],
  },
  {
    id: 'commercial', name: 'Commercial Van', icon: '🚐', baseDemand: 10000, refPrice: 19000, baseCost: 12000,
    devCost: 500_000, devQuarters: 3,
    weights: { performance: 0.15, efficiency: 0.35, comfort: 0.05, technology: 0.05, reliability: 0.4 },
    elasticity: 2.5, prestigeSens: 0.1, requires: { manufacturing: 3 },
    modelNames: ['Courier', 'Cargo', 'Transit', 'Porter', 'Depot'],
  },
  {
    id: 'suv', name: 'SUV', icon: '🚙', baseDemand: 14000, refPrice: 20000, baseCost: 11500,
    devCost: 700_000, devQuarters: 3,
    weights: { performance: 0.2, efficiency: 0.1, comfort: 0.3, technology: 0.15, reliability: 0.25 },
    elasticity: 1.8, prestigeSens: 0.55, requires: { comfort: 3, chassis: 2 },
    modelNames: ['Summit', 'Atlas', 'Sierra', 'Tundra', 'Glacier', 'Canyon'],
  },
  {
    id: 'sports', name: 'Sports Car', icon: '🏎️', baseDemand: 4000, refPrice: 32000, baseCost: 17000,
    devCost: 1_000_000, devQuarters: 4,
    weights: { performance: 0.45, efficiency: 0.05, comfort: 0.15, technology: 0.15, reliability: 0.2 },
    elasticity: 1.4, prestigeSens: 1.0, requires: { engine: 3, chassis: 3 },
    modelNames: ['Strada', 'Viper', 'Falco', 'Arrow', 'Scirocco', 'Corsa'],
  },
  {
    id: 'supercar', name: 'Supercar', icon: '🔥', baseDemand: 600, refPrice: 160000, baseCost: 75000,
    devCost: 5_000_000, devQuarters: 5,
    weights: { performance: 0.5, efficiency: 0, comfort: 0.2, technology: 0.2, reliability: 0.1 },
    elasticity: 1, prestigeSens: 1.5, requires: { engine: 6, chassis: 5 }, requiresPrestige: 40,
    modelNames: ['Furia', 'Tempesta', 'Inferno', 'Vendetta', 'Zenith'],
  },
  {
    id: 'hypercar', name: 'Hypercar', icon: '⚡', baseDemand: 70, refPrice: 1_400_000, baseCost: 520000,
    devCost: 25_000_000, devQuarters: 6,
    weights: { performance: 0.5, efficiency: 0, comfort: 0.15, technology: 0.3, reliability: 0.05 },
    elasticity: 0.7, prestigeSens: 2, requires: { engine: 9, chassis: 8, electronics: 7 }, requiresPrestige: 70,
    modelNames: ['Apex', 'Singularity', 'Eclipse', 'Valhalla', 'Aether'],
  },
];
export const SEGMENT_MAP = Object.fromEntries(SEGMENTS.map((s) => [s.id, s])) as Record<SegmentId, SegmentDef>;

export interface RegionDef {
  id: RegionId;
  name: string;
  flag: string;
  scale: number;
  segMult: Record<SegmentId, number>;
  statBonus: Partial<Stats>; // added to segment weights, then renormalised
  prestigeMult: number;
  unlockYear: number;
  entryCost: number;
  note: string;
}

export const REGIONS: RegionDef[] = [
  {
    id: 'europe', name: 'Europe', flag: '🇪🇺', scale: 1.0,
    segMult: { economy: 1.2, hatchback: 1.5, sedan: 1, suv: 0.7, truck: 0.35, commercial: 1.1, sports: 1.1, supercar: 1.2, hypercar: 1.2 },
    statBonus: { efficiency: 0.1, comfort: 0.05 }, prestigeMult: 1.1, unlockYear: 0, entryCost: 2_000_000,
    note: 'Values efficiency and safety. Loves hatchbacks.',
  },
  {
    id: 'northAmerica', name: 'North America', flag: '🌎', scale: 1.1,
    segMult: { economy: 0.7, hatchback: 0.5, sedan: 1.3, suv: 1.6, truck: 2.2, commercial: 1, sports: 1.2, supercar: 1.3, hypercar: 1.1 },
    statBonus: { performance: 0.12 }, prestigeMult: 1, unlockYear: 0, entryCost: 3_000_000,
    note: 'Big, powerful cars. Trucks and SUVs sell hugely.',
  },
  {
    id: 'japan', name: 'Japan', flag: '🇯🇵', scale: 0.6,
    segMult: { economy: 1.4, hatchback: 1.2, sedan: 1, suv: 0.8, truck: 0.5, commercial: 0.9, sports: 1.1, supercar: 0.7, hypercar: 0.7 },
    statBonus: { reliability: 0.15 }, prestigeMult: 0.9, unlockYear: 0, entryCost: 2_500_000,
    note: 'Reliability and engineering quality above all.',
  },
  {
    id: 'restOfWorld', name: 'Rest of World', flag: '🌍', scale: 0.8,
    segMult: { economy: 1.5, hatchback: 1.2, sedan: 0.9, suv: 1, truck: 1.3, commercial: 1.3, sports: 0.5, supercar: 0.4, hypercar: 0.4 },
    statBonus: { reliability: 0.1, efficiency: 0.05 }, prestigeMult: 0.8, unlockYear: 0, entryCost: 1_500_000,
    note: 'Price-sensitive. Tough, cheap, reliable cars.',
  },
  {
    id: 'china', name: 'China', flag: '🇨🇳', scale: 1.0, // scale grows with time, see regionScale()
    segMult: { economy: 1, hatchback: 0.8, sedan: 1.3, suv: 1.2, truck: 0.6, commercial: 1, sports: 0.8, supercar: 1.2, hypercar: 1.3 },
    statBonus: { technology: 0.15 }, prestigeMult: 1.3, unlockYear: 1995, entryCost: 6_000_000,
    note: 'Opens in 1995 and grows fast. Prizes technology and prestige.',
  },
];
export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, RegionDef>;

export const COUNTRIES: { name: string; flag: string; region: RegionId }[] = [
  { name: 'United Kingdom', flag: '🇬🇧', region: 'europe' },
  { name: 'Germany', flag: '🇩🇪', region: 'europe' },
  { name: 'Italy', flag: '🇮🇹', region: 'europe' },
  { name: 'France', flag: '🇫🇷', region: 'europe' },
  { name: 'Sweden', flag: '🇸🇪', region: 'europe' },
  { name: 'United States', flag: '🇺🇸', region: 'northAmerica' },
  { name: 'Canada', flag: '🇨🇦', region: 'northAmerica' },
  { name: 'Japan', flag: '🇯🇵', region: 'japan' },
  { name: 'South Korea', flag: '🇰🇷', region: 'restOfWorld' },
  { name: 'Brazil', flag: '🇧🇷', region: 'restOfWorld' },
  { name: 'Australia', flag: '🇦🇺', region: 'restOfWorld' },
];

export const PHILOSOPHIES: Record<Philosophy, { name: string; icon: string; desc: string }> = {
  performance: { name: 'Performance', icon: '🏁', desc: 'Starts with better engines. Sports cars come sooner.' },
  reliability: { name: 'Reliability', icon: '🔧', desc: 'Starts with better manufacturing. Cars that never break.' },
  luxury: { name: 'Luxury', icon: '💎', desc: 'Starts with fine interiors. Buyers forgive higher prices.' },
  value: { name: 'Value', icon: '💰', desc: 'Every car is 10% cheaper to build. Win on price.' },
  innovation: { name: 'Innovation', icon: '💡', desc: '+25% research speed and better electronics.' },
  motorsport: { name: 'Motorsport', icon: '🏆', desc: 'Starts with some prestige and faster race cars.' },
};

export const LOGOS = ['🦅', '🐎', '🐂', '🦁', '⚡', '🌟', '🔱', '🐍', '🦊', '🛡️', '🔥', '🐺'];
export const BRAND_COLORS = ['#E10600', '#FF8700', '#00A19C', '#1E5BC6', '#7B2CBF', '#F5C400', '#2E7D32', '#EDEDED'];

// Factory levels: capacity (cars per quarter) and build cost
export const FACTORIES = [
  { name: 'Garage Workshop', capacity: 60, cost: 0, maxEngineers: 6 },
  { name: 'Small Assembly Shop', capacity: 300, cost: 600_000, maxEngineers: 14 },
  { name: 'Regional Plant', capacity: 1500, cost: 5_000_000, maxEngineers: 30 },
  { name: 'Production Factory', capacity: 6000, cost: 25_000_000, maxEngineers: 60 },
  { name: 'Major Factory', capacity: 20000, cost: 90_000_000, maxEngineers: 120 },
  { name: 'Industrial Complex', capacity: 60000, cost: 300_000_000, maxEngineers: 250 },
  { name: 'Multi-Plant Network', capacity: 150000, cost: 800_000_000, maxEngineers: 500 },
  { name: 'Global Manufacturing', capacity: 400000, cost: 2_200_000_000, maxEngineers: 900 },
  { name: 'Automotive Megacorp', capacity: 1_000_000, cost: 6_000_000_000, maxEngineers: 1500 },
];

export const ENGINEER_SALARY = 10000; // per quarter
export const ENGINEER_HIRE_FEE = 5000;
export const LAB_COST_PER_ENGINEER = 5000; // per spending level per quarter

export interface TierDef {
  name: string;
  short: string;
  minPrestige: number;
  seasonCost: number; // per season
  rounds: number;
  fieldAvg: number;
  fieldSize: number;
  prizePerWin: number;
  titlePrestige: number;
  requiresElectric?: number;
}

export const TIERS: TierDef[] = [
  { name: 'Amateur Rally', short: 'RALLY', minPrestige: 0, seasonCost: 40_000, rounds: 6, fieldAvg: 32, fieldSize: 10, prizePerWin: 5_000, titlePrestige: 2 },
  { name: 'Club Racing', short: 'CLUB', minPrestige: 3, seasonCost: 120_000, rounds: 8, fieldAvg: 40, fieldSize: 12, prizePerWin: 15_000, titlePrestige: 3 },
  { name: 'Regional Championship', short: 'REG', minPrestige: 7, seasonCost: 350_000, rounds: 8, fieldAvg: 47, fieldSize: 14, prizePerWin: 40_000, titlePrestige: 4 },
  { name: 'Formula 4', short: 'F4', minPrestige: 12, seasonCost: 900_000, rounds: 10, fieldAvg: 54, fieldSize: 16, prizePerWin: 80_000, titlePrestige: 5 },
  { name: 'Formula Regional', short: 'FREG', minPrestige: 18, seasonCost: 2_000_000, rounds: 10, fieldAvg: 60, fieldSize: 16, prizePerWin: 150_000, titlePrestige: 6 },
  { name: 'Formula 3', short: 'F3', minPrestige: 24, seasonCost: 4_000_000, rounds: 10, fieldAvg: 65, fieldSize: 20, prizePerWin: 250_000, titlePrestige: 7 },
  { name: 'Formula 2', short: 'F2', minPrestige: 30, seasonCost: 8_000_000, rounds: 12, fieldAvg: 70, fieldSize: 20, prizePerWin: 500_000, titlePrestige: 8 },
  { name: 'GT Racing', short: 'GT', minPrestige: 36, seasonCost: 13_000_000, rounds: 10, fieldAvg: 73, fieldSize: 20, prizePerWin: 650_000, titlePrestige: 9 },
  { name: 'Formula E', short: 'FE', minPrestige: 42, seasonCost: 25_000_000, rounds: 14, fieldAvg: 77, fieldSize: 22, prizePerWin: 1_000_000, titlePrestige: 11, requiresElectric: 4 },
  { name: 'Endurance Racing', short: 'WEC', minPrestige: 50, seasonCost: 45_000_000, rounds: 8, fieldAvg: 81, fieldSize: 18, prizePerWin: 1_600_000, titlePrestige: 13 },
  { name: 'Formula 1', short: 'F1', minPrestige: 60, seasonCost: 130_000_000, rounds: 22, fieldAvg: 86, fieldSize: 20, prizePerWin: 3_000_000, titlePrestige: 20 },
];

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const TRAIT_INFO: Record<string, { name: string; icon: string; desc: string }> = {
  qualifier: { name: 'Qualifier', icon: '⏱️', desc: 'Starts races near the front.' },
  wet: { name: 'Rain Master', icon: '🌧️', desc: 'Much faster in wet races.' },
  consistent: { name: 'Consistent', icon: '🎯', desc: 'Fewer mistakes and retirements.' },
  developer: { name: 'Developer', icon: '🔩', desc: 'Car development is 50% faster.' },
  fanFavourite: { name: 'Fan Favourite', icon: '⭐', desc: 'Results boost brand prestige and awareness more.' },
};

export const FIRST_NAMES = ['Luca', 'James', 'Max', 'Kimi', 'Sergio', 'Ayrton', 'Niki', 'Jenson', 'Carlos', 'Pierre', 'Mika', 'Lewis', 'Felipe', 'Sebastian', 'Fernando', 'Daniel', 'Oscar', 'Lando', 'George', 'Charles', 'Esteban', 'Yuki', 'Kenji', 'Mateo', 'Emil', 'Rafael', 'Tom', 'Jack', 'Nico', 'Alex', 'Valtteri', 'Theo', 'Hugo', 'Sofia', 'Jamie', 'Bianca', 'Leo', 'Marco', 'Ivan', 'Arvid'];
export const LAST_NAMES = ['Rossi', 'Hart', 'Weber', 'Lindqvist', 'Moreau', 'Tanaka', 'Silva', 'Novak', 'Castillo', 'Becker', 'Okafor', 'Hughes', 'Fontaine', 'Marchetti', 'Sato', 'Kowalski', 'Andersen', 'Duarte', 'Fischer', 'Brennan', 'Ito', 'Varga', 'Costa', 'Laurent', 'Holm', 'Reyes', 'Kerr', 'Vance', 'Oduya', 'Nakamura', 'Bauer', 'Ferreira', 'Rinaldi', 'Ward', 'Ström'];
export const NATIONALITIES = ['🇬🇧', '🇩🇪', '🇮🇹', '🇫🇷', '🇪🇸', '🇧🇷', '🇯🇵', '🇺🇸', '🇫🇮', '🇳🇱', '🇦🇺', '🇲🇽', '🇸🇪', '🇨🇦', '🇰🇷'];

export const RACE_VENUES = ['Silverstone', 'Monza', 'Spa', 'Suzuka', 'Interlagos', 'Monaco', 'Hockenheim', 'Imola', 'Zandvoort', 'Montreal', 'Austin', 'Bathurst', 'Nürburgring', 'Le Mans', 'Brands Hatch', 'Laguna Seca', 'Barcelona', 'Melbourne', 'Shanghai', 'Fuji', 'Mugello', 'Portimão'];
export const AI_TEAMS = ['Apex Motorsport', 'Redline Racing', 'Hartmann GP', 'Scuderia Lupo', 'Blue Comet', 'Torque Works', 'Velocity Engineering', 'Northstar Racing', 'Ironside Motorsport', 'Kestrel Racing', 'Sunrise Racing', 'Gridline', 'Phoenix Autosport', 'Corsa Nero', 'Summit Racing', 'Atlas Racing', 'Volta Motorsport', 'Zenith Racing', 'Orbit GP', 'Crown Racing', 'Ember Motorsport', 'Falcon Racing'];

export const RIVAL_SEEDS = [
  { name: 'Kessler', region: 'europe' as RegionId, prestige: 55, tech: 3.2, focus: 'performance' as const, segs: ['hatchback', 'sedan', 'sports', 'suv'] },
  { name: 'Vantor Motors', region: 'europe' as RegionId, prestige: 35, tech: 2.6, focus: 'value' as const, segs: ['economy', 'hatchback', 'sedan', 'commercial'] },
  { name: 'Aurelia', region: 'europe' as RegionId, prestige: 72, tech: 3.0, focus: 'luxury' as const, segs: ['sports', 'supercar', 'sedan'] },
  { name: 'Ridgeway Motor Co.', region: 'northAmerica' as RegionId, prestige: 45, tech: 2.5, focus: 'performance' as const, segs: ['sedan', 'truck', 'suv', 'commercial'] },
  { name: 'Columbia Auto', region: 'northAmerica' as RegionId, prestige: 38, tech: 2.4, focus: 'value' as const, segs: ['economy', 'sedan', 'truck', 'suv'] },
  { name: 'Hokuto', region: 'japan' as RegionId, prestige: 40, tech: 2.9, focus: 'reliability' as const, segs: ['economy', 'hatchback', 'sedan', 'suv', 'truck'] },
  { name: 'Sakura Motors', region: 'japan' as RegionId, prestige: 33, tech: 2.7, focus: 'reliability' as const, segs: ['economy', 'hatchback', 'commercial', 'sports'] },
  { name: 'Lumina Auto', region: 'china' as RegionId, prestige: 15, tech: 2.0, focus: 'value' as const, segs: ['economy', 'hatchback', 'sedan', 'suv'] },
];

export const SPONSOR_NAMES: Record<'luxury' | 'tech' | 'consumer', string[][]> = {
  // [small, medium, global]
  luxury: [['Marlowe Watches', 'Bellini Leather'], ['Château Verane', 'Orsini Couture'], ['Lumière Haute Horlogerie', 'Royal Sovereign']],
  tech: [['Byteforge', 'Circuitry Ltd'], ['Quantix Systems', 'Neuron Labs'], ['Omnicore', 'Helix Global']],
  consumer: [["Dave's Tyres", 'Fizz Cola'], ['Rapid Energy Drink', 'MegaMart'], ['Global Petroleum', 'Universe Air']],
};

export const ACHIEVEMENTS: { id: string; name: string; desc: string }[] = [
  { id: 'firstCar', name: 'First Car', desc: 'Launch your first road car.' },
  { id: 'firstRace', name: 'Green Flag', desc: 'Enter your first motorsport season.' },
  { id: 'firstWin', name: 'Victory', desc: 'Win a race.' },
  { id: 'firstTitle', name: 'Champions', desc: 'Win a championship.' },
  { id: 'million', name: 'Millionaire', desc: 'Have $1M in the bank.' },
  { id: 'newMarket', name: 'Going Abroad', desc: 'Enter a second market.' },
  { id: 'global', name: 'Global Brand', desc: 'Sell in every region.' },
  { id: 'legend', name: 'Instant Classic', desc: 'Create a legendary car.' },
  { id: 'sportsCar', name: 'Pure Speed', desc: 'Launch a sports car.' },
  { id: 'supercar', name: 'Supercar Maker', desc: 'Launch a supercar.' },
  { id: 'ev', name: 'Electrified', desc: 'Launch an electric car.' },
  { id: 'prestige50', name: 'Respected Name', desc: 'Reach 50 prestige.' },
  { id: 'prestige90', name: 'Icon', desc: 'Reach 90 prestige.' },
  { id: 'billion', name: 'Billion Dollar Company', desc: 'Have $1B in the bank.' },
  { id: 'f1', name: 'The Pinnacle', desc: 'Enter Formula 1.' },
  { id: 'f1Title', name: 'World Champions', desc: 'Win the Formula 1 championship.' },
  { id: 'group', name: 'Automotive Group', desc: 'Acquire a rival brand.' },
  { id: 'empire', name: 'Empire', desc: 'Own three rival brands.' },
  { id: 'millionCars', name: 'Mass Producer', desc: 'Sell 1,000,000 cars in total.' },
];
