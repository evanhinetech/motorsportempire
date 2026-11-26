# Motorsport Empire — playable prototype

A mobile business and motorsport strategy game built with **Expo (React Native) + TypeScript**.
Start in 1975 with a garage, $600K and no reputation. Design cars, sell them, research technology,
climb the motorsport ladder from Amateur Rally to Formula 1, and grow into a global automotive group.

## Run it

You need Node.js 20+ and a phone with the **Expo Go** app (or an iOS/Android simulator).

```bash
npm install
npx expo start          # scan the QR code with Expo Go
npx expo start --web    # or play in a browser
```

Other useful commands:

```bash
npx tsc --noEmit                         # typecheck
npx tsx scripts/simulate.ts 40 7 value   # bot plays 40 years (seed 7, Value philosophy) for balance testing
npx expo export -p web && node scripts/build-single-html.mjs   # one-file web build in web-build/
```

## What's in the prototype

| Area | What you can do |
| --- | --- |
| **Company** | Name, logo, racing colour, one of six founding philosophies, country of origin (sets home market). |
| **Cars** | 9 vehicle types (economy → hypercar), petrol or electric, five engineering sliders, price setting with a live demand/profit forecast. Cars build reputation, age, can become *legendary*, and get next generations that inherit the line's reputation. Flops and recalls hurt prestige. |
| **Research** | Six tech areas (engines, chassis, interiors & safety, electronics, manufacturing, electric). Levels raise stat ceilings and unlock vehicle types. Hire engineers, set a lab budget. |
| **Racing** | 11-tier ladder: Amateur Rally, Club, Regional, F4, Formula Regional, F3, F2, GT, Formula E, Endurance, F1. Top-3 finishes unlock the next tier; prestige gates entry. Drivers have skill, age curves and traits (qualifier, rain master, consistent, developer, fan favourite). Race-by-race simulation with wet races and retirements. Sponsors with objectives and relationships. |
| **Empire** | Factory upgrades (60 → 1,000,000 cars/quarter), marketing, five world markets with different tastes (China opens in 1995), automatic bank loans and bankruptcy, rival acquisitions, 19 achievements. |
| **Living world** | 8 AI rival brands that improve, struggle and can go bankrupt. World events and trends: 1979 oil crisis, SUV boom, 2008 crash, EV transition, petrol phase-outs from 2035. |

Prestige is the heart of it: racing results, great cars and research earn it slowly; flops, recalls,
and bad seasons lose it fast. Prestige lifts car demand (especially premium segments), unlocks better
drivers, sponsors, supercars, higher racing tiers and acquisitions.

## Project layout

```
App.tsx                     app shell: top bar, tabs, End Quarter, quarter summary
src/engine/types.ts         game state types
src/engine/data.ts          all tunable content: segments, regions, tiers, factories, names
src/engine/sim.ts           the simulation: market model, actions, quarter loop (pure TS, no React)
src/state/GameContext.tsx   React state + autosave (AsyncStorage)
src/screens/                Setup, HQ, Cars (+ designer), Research, Racing, Empire
src/ui/kit.tsx              shared UI components (cards, slider, sheets...)
scripts/simulate.ts         headless bot for balance testing
```

The engine never touches React, so you can change numbers in `data.ts`/`sim.ts` and rerun
`scripts/simulate.ts` to see how a 50-year game plays out before opening the app.

## How the market works (short version)

For every market region and vehicle type, each car gets an *appeal*:
`quality³ × price factor × brand (prestige) × awareness × reputation × freshness × powertrain trend`.
Sales are split between your cars, AI rivals and small makers by appeal, then capped by factory capacity.
Quality is a weighted mix of your car's five stats; the weights depend on the vehicle type, the region
and the year (efficiency matters more during the oil crisis, technology more over time).

## Good next steps

- Navigation with Expo Router and real app icons/splash screen
- Multiple simultaneous racing programmes and a team staff system (engineers, team principal)
- Sub-brands after acquisition (sell their cars under their name)
- Cloud saves, events with choices, tutorial flow, sound and haptics
- Build for the stores with EAS: `npx eas-cli@latest build`

## License

MIT, see [LICENSE](LICENSE).
