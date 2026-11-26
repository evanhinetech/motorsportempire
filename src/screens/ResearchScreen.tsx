import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ENGINEER_HIRE_FEE, ENGINEER_SALARY, LAB_COST_PER_ENGINEER, MAX_TECH, SEGMENTS, TECH_AREAS, TECH_INFO, techLevelCost } from '../engine/data';
import { fireEngineers, hireEngineers, maxEngineers, money, researchPoints, setResearchFocus, setResearchSpending, yearOf } from '../engine/sim';
import type { TechArea } from '../engine/types';
import { useActiveGame } from '../state/GameContext';
import { Bar, Between, Button, C, Card, Pill, Row, Screen, Section, Segmented, Stat, font } from '../ui/kit';

export default function ResearchScreen() {
  const { game: s, act } = useActiveGame();
  const rp = researchPoints(s);
  const year = yearOf(s.quarter);

  const unlocksFor = (a: TechArea) =>
    SEGMENTS.filter((seg) => (seg.requires[a] ?? 0) === s.tech[a] + 1).map((seg) => `${seg.icon} ${seg.name}`);

  return (
    <Screen>
      <Card>
        <Row style={{ gap: 12 }}>
          <Stat label="Engineers" value={`${s.engineers} / ${maxEngineers(s)}`} />
          <Stat label="Research / qtr" value={`${rp.toLocaleString()} pts`} color={C.blue} />
        </Row>
        <Text style={font.small}>Each engineer costs {money(ENGINEER_SALARY)} per quarter (hiring fee {money(ENGINEER_HIRE_FEE)}). Bigger factories have room for more staff.</Text>
        <Row>
          <Button small label="Hire 1" onPress={() => act((g) => hireEngineers(g, 1))} />
          <Button small label="Hire 5" onPress={() => act((g) => hireEngineers(g, 5))} />
          <Button small label="Hire 25" onPress={() => act((g) => hireEngineers(g, 25))} />
          <Button small kind="ghost" label="Let 1 go" onPress={() => act((g) => fireEngineers(g, 1))} />
        </Row>
      </Card>

      <Section title="Lab budget">
        <Card>
          <Segmented
            options={[{ label: 'None', value: 0 }, { label: 'Basic', value: 1 }, { label: 'Strong', value: 2 }, { label: 'Max', value: 3 }]}
            value={s.researchSpending}
            onChange={(v) => act((g) => setResearchSpending(g, v as 0 | 1 | 2 | 3))}
          />
          <Text style={font.small}>
            +{s.researchSpending * 50}% research speed for {money(s.researchSpending * s.engineers * LAB_COST_PER_ENGINEER)} per quarter.
          </Text>
        </Card>
      </Section>

      <Section title="Research projects">
        {TECH_AREAS.map((a) => {
          const info = TECH_INFO[a];
          const lvl = s.tech[a];
          const locked = info.unlockYear > year;
          const maxed = lvl >= MAX_TECH;
          const need = techLevelCost(lvl);
          const prog = s.researchProgress[a];
          const active = s.researchFocus === a;
          const eta = Math.ceil(Math.max(0, need - prog) / Math.max(1, rp));
          const unlocks = unlocksFor(a);
          return (
            <Pressable key={a} onPress={() => !locked && !maxed && act((g) => setResearchFocus(g, a))}>
              <Card style={{ borderColor: active ? C.blue : C.line, backgroundColor: active ? '#111A27' : C.panel, opacity: locked ? 0.5 : 1 }}>
                <Between>
                  <Text style={[font.body, { fontWeight: '800' }]}>{info.name}</Text>
                  {active ? <Pill label="RESEARCHING" color={C.blue} /> : locked ? <Pill label={`OPENS ${info.unlockYear}`} /> : maxed ? <Pill label="MAXED" color={C.green} /> : null}
                </Between>
                <Text style={font.small}>{info.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {Array.from({ length: MAX_TECH }, (_, i) => (
                    <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: i < lvl ? C.blue : C.line }} />
                  ))}
                </View>
                <Between>
                  <Text style={font.small}>Level {lvl}</Text>
                  {!maxed && !locked && <Text style={font.small}>{Math.floor(prog).toLocaleString()} / {need.toLocaleString()} pts{active ? ` · ~${eta} qtr${eta === 1 ? '' : 's'}` : ''}</Text>}
                </Between>
                {!maxed && !locked && <Bar value={prog} max={need} color={C.blue} height={4} />}
                {unlocks.length > 0 && <Text style={{ color: C.green, fontSize: 12 }}>Next level unlocks: {unlocks.join(', ')}</Text>}
                {a === 'electric' && lvl < 3 && !locked && <Text style={{ color: C.green, fontSize: 12 }}>Level 3 unlocks electric cars</Text>}
              </Card>
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}
