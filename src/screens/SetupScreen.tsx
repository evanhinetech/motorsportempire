import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../ui/Text';
import { BRAND_COLORS, COUNTRIES, LOGOS, PHILOSOPHIES, START_YEAR } from '../engine/data';
import { newGame } from '../engine/sim';
import type { Philosophy } from '../engine/types';
import { useGame } from '../state/GameContext';
import { Button, C, Card, Chip, Row, Screen, Section, font } from '../ui/kit';

export default function SetupScreen() {
  const { setGame } = useGame();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState(LOGOS[0]);
  const [color, setColor] = useState(BRAND_COLORS[0]);
  const [philosophy, setPhilosophy] = useState<Philosophy>('performance');
  const [country, setCountry] = useState(COUNTRIES[0].name);

  const start = () => setGame(newGame({ name: name.trim() || 'Garage Motors', logo, color, philosophy, country }));

  return (
    <Screen>
      <View style={{ paddingTop: 12, gap: 6 }}>
        <View style={{ gap: 0, marginBottom: 6 }}>
          <View style={{ height: 6, backgroundColor: '#E2702A' }} />
          <View style={{ height: 6, backgroundColor: '#E8B13A' }} />
          <View style={{ height: 6, backgroundColor: '#6B3A1E' }} />
        </View>
        <Text style={{ color: C.dim, fontWeight: '700', fontSize: 13 }}>Est. {START_YEAR} · a garage and a dream</Text>
        <Text style={{ fontFamily: 'display', color: C.text, fontSize: 44, lineHeight: 46 }}>Motorsport{'\n'}Empire</Text>
        <Text style={[font.small, { fontSize: 15, marginTop: 4 }]}>
          Build cars. Win races. Grow a small workshop into the greatest automotive brand in history.
        </Text>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 32 }}>{logo}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={font.small}>Company name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Garage Motors"
              placeholderTextColor={C.faint}
              maxLength={24}
              style={{ color: C.text, fontSize: 22, fontWeight: '800', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}
            />
          </View>
        </View>
        <Text style={font.small}>Logo</Text>
        <Row>
          {LOGOS.map((l) => (
            <Pressable key={l} onPress={() => setLogo(l)} style={{ width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: l === logo ? C.panel2 : 'transparent', borderWidth: 1, borderColor: l === logo ? C.red : C.line }}>
              <Text style={{ fontSize: 22 }}>{l}</Text>
            </Pressable>
          ))}
        </Row>
        <Text style={font.small}>Racing colour</Text>
        <Row>
          {BRAND_COLORS.map((c) => (
            <Pressable key={c} onPress={() => setColor(c)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: 3, borderColor: c === color ? C.text : 'transparent' }} />
          ))}
        </Row>
      </Card>

      <Section title="Founding philosophy">
        {(Object.keys(PHILOSOPHIES) as Philosophy[]).map((p) => {
          const info = PHILOSOPHIES[p];
          const on = p === philosophy;
          return (
            <Pressable key={p} onPress={() => setPhilosophy(p)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? C.red : C.line, backgroundColor: on ? C.panel2 : C.panel }}>
                <Text style={{ fontSize: 24 }}>{info.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{info.name}</Text>
                  <Text style={font.small}>{info.desc}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </Section>

      <Section title="Country of origin">
        <Row>
          {COUNTRIES.map((c) => (
            <Chip key={c.name} label={`${c.flag} ${c.name}`} on={c.name === country} onPress={() => setCountry(c.name)} />
          ))}
        </Row>
        <Text style={font.small}>Your first cars sell in your home market. You can expand abroad later.</Text>
      </Section>

      <Button label="Found the company" kind="primary" onPress={start} />
    </Screen>
  );
}
