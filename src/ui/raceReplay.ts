// Pure geometry and race-plan helpers for the race replay (no React Native imports,
// so they can be tested with tsx). See RaceViewer.tsx for how they are used.
import type { Entrant, RaceResult } from '../engine/types';

export const LAPS = 5;
const TEAM_COLORS = ['#4C9BFF', '#FF8700', '#00A19C', '#F5C400', '#B388FF', '#FF5C8A', '#7CD992', '#C0C4CC', '#FF6B3D', '#5ED3F3'];

// ---------- deterministic helpers ----------
export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------- track ----------
export interface Track {
  pts: { x: number; y: number }[]; // unit box 0..1, evenly spaced along the lap
}

export function buildTrack(venue: string): Track {
  // A smooth closed curve; small harmonics give each venue its own shape without self-crossing.
  const a = 0.12 + hash(venue + 'a') * 0.26;
  const b = 0.08 + hash(venue + 'b') * 0.24;
  const c = 0.05 + hash(venue + 'c') * 0.13;
  const ph = hash(venue + 'p') * Math.PI * 2;
  const raw: { x: number; y: number }[] = [];
  const N = 600;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    raw.push({
      x: Math.cos(t) + a * Math.cos(2 * t + ph) + c * Math.sin(3 * t),
      y: Math.sin(t) * 0.8 + b * Math.sin(2 * t + ph) + c * Math.cos(3 * t + ph),
    });
  }
  // even spacing by arc length
  const len = [0];
  for (let i = 1; i <= N; i++) {
    const p = raw[i % N];
    const q = raw[i - 1];
    len.push(len[i - 1] + Math.hypot(p.x - q.x, p.y - q.y));
  }
  const total = len[N];
  const M = 240;
  const even: { x: number; y: number }[] = [];
  let j = 0;
  for (let k = 0; k < M; k++) {
    const target = (k / M) * total;
    while (len[j + 1] < target) j++;
    const f = (target - len[j]) / (len[j + 1] - len[j] || 1);
    const p = raw[j];
    const q = raw[(j + 1) % N];
    even.push({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f });
  }
  const xs = even.map((p) => p.x);
  const ys = even.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { pts: even.map((p) => ({ x: (p.x - minX) / (maxX - minX), y: (p.y - minY) / (maxY - minY) })) };
}

export function pointAt(track: Track, u: number) {
  const M = track.pts.length;
  const f = (((u % 1) + 1) % 1) * M;
  const i = Math.floor(f);
  const p = track.pts[i % M];
  const q = track.pts[(i + 1) % M];
  const r = f - i;
  return { x: p.x + (q.x - p.x) * r, y: p.y + (q.y - p.y) * r, dx: q.x - p.x, dy: q.y - p.y };
}

// ---------- race plan ----------
export interface Runner {
  e: Entrant;
  color: string;
  grid: number; // starting position, 0 = pole
  finish: number; // final position, 0 = winner; DNF cars get positions after finishers
  dnfAt: number | null; // race progress (0..1) when the car retires
  wobble: number;
  phase: number;
}

export function planRace(entrants: Entrant[], race: RaceResult, playerColor: string): Runner[] {
  const key = `${race.round}:${race.name}`;
  const teams = [...new Set(entrants.map((e) => e.team))];
  // grid: pace plus a bit of luck, so faster cars usually start ahead
  const quali = entrants
    .map((e) => ({ e, q: 0.6 * e.carRating + 0.4 * e.driverSkill + (hash(key + e.id + 'q') - 0.5) * 10 }))
    .sort((a, b) => b.q - a.q);
  const finishOrder = [...race.order, ...race.dnf];
  return entrants.map((e) => {
    const dnf = race.dnf.includes(e.id);
    return {
      e,
      color: e.isPlayer ? playerColor : TEAM_COLORS[teams.indexOf(e.team) % TEAM_COLORS.length],
      grid: quali.findIndex((x) => x.e.id === e.id),
      finish: finishOrder.indexOf(e.id),
      dnfAt: dnf ? 0.15 + hash(key + e.id + 'd') * 0.7 : null,
      wobble: (hash(key + e.id + 'w') - 0.5) * 0.06,
      phase: hash(key + e.id + 'p') * Math.PI * 2,
    };
  });
}

/** Distance covered in laps at race progress t (0..1). */
export function distance(r: Runner, t: number): number {
  const tt = r.dnfAt !== null ? Math.min(t, r.dnfAt) : t;
  const start = -r.grid * 0.016;
  const end = -r.finish * 0.03;
  const swing = r.wobble * Math.sin(Math.PI * tt) * (1 + 0.5 * Math.sin(tt * 9 + r.phase));
  return tt * LAPS + start + (end - start) * ease(tt) + swing;
}

