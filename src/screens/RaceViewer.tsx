// Animated replay of a race that the engine has already simulated.
// The engine only stores the finishing order and retirements, so the replay invents a
// believable race (grid, overtakes, retirement laps) that always ends in the real result.
// Everything is derived deterministically from the race, so a replay looks the same each time.

import React, { memo, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { TIERS } from '../engine/data';
import type { GameState, RaceResult } from '../engine/types';
import { LAPS, Track, buildTrack, distance, planRace, pointAt } from '../ui/raceReplay';
import { Between, Button, C, Card, Pill, Row, Segmented, Sheet, font } from '../ui/kit';

const RACE_MS = 32_000; // at 1x speed
const LIGHTS_MS = 2_200;
const LAP_SECONDS = 92; // for showing gaps in seconds

// ---------- components ----------
const TrackLayer = memo(function TrackLayer({ track, w, h, wet }: { track: Track; w: number; h: number; wet: boolean }) {
  const pad = 18;
  const startPt = pointAt(track, 0);
  const ang = Math.atan2(startPt.dy * h, startPt.dx * w);
  return (
    <>
      {track.pts.filter((_, i) => i % 2 === 0).map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: pad + p.x * (w - pad * 2) - 11, top: pad + p.y * (h - pad * 2) - 11,
            width: 22, height: 22, borderRadius: 11, backgroundColor: wet ? '#2B3440' : '#30343D',
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute', left: pad + startPt.x * (w - pad * 2) - 2, top: pad + startPt.y * (h - pad * 2) - 13,
          width: 4, height: 26, backgroundColor: '#F2F3F5', transform: [{ rotate: `${ang + Math.PI / 2}rad` }],
        }}
      />
    </>
  );
});

export default function RaceViewer({ s, race, onClose }: { s: GameState; race: RaceResult; onClose: () => void }) {
  const season = s.racing.season!;
  const tier = TIERS[season.tier];
  const track = useMemo(() => buildTrack(race.name), [race.name]);
  const runners = useMemo(() => planRace(season.entrants, race, C.red), [season.entrants, race]);
  const [w, setW] = useState(0);
  const h = Math.round(w * 0.62);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [playing, setPlaying] = useState(true);

  const total = LIGHTS_MS + RACE_MS;
  const done = elapsed >= total;

  useEffect(() => {
    if (!playing || done) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) * speed;
      last = now;
      setElapsed((e) => Math.min(total, e + dt));
    }, 33);
    return () => clearInterval(id);
  }, [playing, done, speed, total]);

  const t = Math.max(0, (elapsed - LIGHTS_MS) / RACE_MS);
  const live = runners
    .map((r) => ({ r, d: distance(r, t), out: r.dnfAt !== null && t >= r.dnfAt }))
    .sort((a, b) => (a.out === b.out ? b.d - a.d : a.out ? 1 : -1));
  const leaderD = live[0].d;
  const me = live.findIndex((x) => x.r.e.isPlayer);
  const lap = Math.min(LAPS, Math.max(1, Math.floor(leaderD) + 1));
  const lightsOn = elapsed < LIGHTS_MS ? Math.min(5, Math.floor((elapsed / LIGHTS_MS) * 6)) : 0;
  const finalPos = race.order.indexOf('player');

  const pad = 18;
  const board = live.filter((_, i) => i < 4 || i === me);

  return (
    <Sheet visible onClose={onClose} title={`R${race.round} ${race.name}`}>
      <Row>
        <Pill label={tier.short} color={C.amber} />
        {race.wet && <Pill label="🌧️ WET" color={C.blue} />}
        <Text style={font.small}>{season.year} {tier.name}</Text>
      </Row>

      <View
        onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}
        style={{ width: '100%', height: h || 220, borderRadius: 14, overflow: 'hidden', backgroundColor: race.wet ? '#0E1620' : '#0F1A14', borderWidth: 1, borderColor: C.line }}
      >
        {w > 0 && <TrackLayer track={track} w={w} h={h} wet={race.wet} />}
        {w > 0 &&
          [...live].reverse().map(({ r, d, out }, idx) => {
            const p = pointAt(track, d);
            // spread cars sideways a little so a pack does not stack into one dot
            const len = Math.hypot(p.dx, p.dy) || 1;
            const lane = ((r.grid % 3) - 1) * 4;
            const x = pad + p.x * (w - pad * 2) + (-p.dy / len) * lane;
            const y = pad + p.y * (h - pad * 2) + (p.dx / len) * lane;
            if (r.e.isPlayer) {
              const ang = Math.atan2(p.dy * h, p.dx * w);
              const right = Math.cos(ang) >= 0;
              const rot = right ? ang : ang - Math.PI;
              return (
                <View key={r.e.id} style={{ position: 'absolute', left: x - 16, top: y - 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: out ? 0.4 : 1, zIndex: 50 }}>
                  <View style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: s.company.color, backgroundColor: s.company.color + '33' }} />
                  <Text style={{ fontSize: 18, transform: [{ rotate: `${rot}rad` }, { scaleX: right ? -1 : 1 }] }}>🏎️</Text>
                </View>
              );
            }
            return (
              <View
                key={r.e.id}
                style={{
                  position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: 5,
                  backgroundColor: out ? C.faint : r.color, borderWidth: 1.5, borderColor: '#0B0C0F', zIndex: idx,
                }}
              />
            );
          })}

        {/* overlays */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 10, top: 8 }}>
          <Text style={{ color: C.text, fontWeight: '900', fontSize: 13 }}>{done ? 'FINISHED 🏁' : elapsed < LIGHTS_MS ? 'GRID' : `LAP ${lap}/${LAPS}`}</Text>
        </View>
        {elapsed < LIGHTS_MS + 600 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#000000cc', padding: 10, borderRadius: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: elapsed >= LIGHTS_MS ? '#2BD576' : i < lightsOn ? '#E10600' : '#2A2E37' }} />
              ))}
            </View>
            {elapsed >= LIGHTS_MS && <Text style={{ color: C.text, fontWeight: '900', marginTop: 6, fontSize: 16 }}>LIGHTS OUT!</Text>}
          </View>
        )}
      </View>

      <Card style={{ gap: 6 }}>
        <Between>
          <Text style={[font.body, { fontWeight: '800' }]}>{s.company.logo} {live[me].r.e.driver}</Text>
          <Text style={[font.num, { fontSize: 22, color: live[me].out ? C.bad : me === 0 ? C.gold : C.text }]}>{live[me].out ? 'OUT' : `P${me + 1}`}</Text>
        </Between>
        {board.map(({ r, d, out }) => {
          const pos = live.findIndex((x) => x.r === r);
          const gap = pos === 0 ? 'Leader' : out ? 'Retired' : `+${((leaderD - d) * LAP_SECONDS).toFixed(1)}s`;
          return (
            <View key={r.e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6, backgroundColor: r.e.isPlayer ? s.company.color + '22' : 'transparent' }}>
              <Text style={[font.num, { width: 28, color: pos === 0 ? C.gold : C.dim }]}>P{pos + 1}</Text>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: out ? C.faint : r.color }} />
              <Text style={{ color: C.text, flex: 1, fontWeight: r.e.isPlayer ? '800' : '600' }} numberOfLines={1}>{r.e.team}</Text>
              <Text style={[font.small, { fontVariant: ['tabular-nums'] }]}>{gap}</Text>
            </View>
          );
        })}
        <Text style={[font.small, { fontSize: 11 }]}>Started P{live[me].r.grid + 1} · {runners.length} cars</Text>
      </Card>

      {done && (
        <Card accent={finalPos === 0 ? C.gold : finalPos > 0 && finalPos < 3 ? C.green : finalPos < 0 ? C.bad : undefined}>
          <Text style={[font.body, { fontWeight: '800' }]}>
            {finalPos === 0 ? '🏆 Victory!' : finalPos > 0 && finalPos < 3 ? `🍾 Podium: P${finalPos + 1}` : finalPos < 0 ? 'Retired from the race' : `Finished P${finalPos + 1}`}
          </Text>
          <Text style={font.small}>
            Podium: {race.order.slice(0, 3).map((id, i) => `${i + 1}. ${season.entrants.find((e) => e.id === id)?.team ?? '—'}`).join('   ')}
          </Text>
        </Card>
      )}

      <Segmented
        options={[{ label: '1×', value: 1 }, { label: '2×', value: 2 }, { label: '4×', value: 4 }]}
        value={speed}
        onChange={(v) => setSpeed(v as 1 | 2 | 4)}
      />
      <Row>
        {done ? (
          <Button label="↺ Watch again" onPress={() => { setElapsed(0); setPlaying(true); }} style={{ flex: 1 }} />
        ) : (
          <Button label={playing ? '❚❚ Pause' : '▶ Play'} onPress={() => setPlaying((p) => !p)} style={{ flex: 1 }} />
        )}
        {!done && <Button kind="ghost" label="Skip to finish" onPress={() => setElapsed(total)} />}
      </Row>
      <Pressable onPress={onClose}><Text style={[font.small, { textAlign: 'center' }]}>The quarter clock is paused while you watch.</Text></Pressable>
    </Sheet>
  );
}
