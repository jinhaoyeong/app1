# Luma

Privacy-first personal menstrual intelligence — learn what is normal for *you*, prepare for what may come next, and notice when something meaningfully changes.

> Most period apps tell you when your next period is. Luma teaches you what your cycle means for you.

## Stack

- Expo (React Native) + TypeScript
- Expo Router navigation
- Zustand + AsyncStorage (local-first)
- Deterministic cycle / prediction / pattern / change engines

## Design toolkit

[Impeccable](https://impeccable.style) skills are installed under `.cursor/` for design direction, critique, and anti-pattern detection.

```bash
npx impeccable skills install -y --providers=cursor --scope=project
```

Product and design context live in `PRODUCT.md` and `DESIGN.md`.

## Run

```bash
npm install
npm start
```

Then open iOS Simulator, Android emulator, Expo Go, or press `w` for web.

## Test

```bash
npm test
npm run typecheck
```

## MVP scope (Phases 1–4)

- Short onboarding + privacy commitment
- Today / Calendar / Insights / You + floating Log
- Period, flow, mood, energy, pain, symptoms, notes
- Prediction **ranges** with confidence (never a single certain date)
- Personal baseline + repeating patterns + change detection
- Period preparation checklist
- Health summary for clinician visits (share/export)
- Privacy controls, discreet mode, biometric preference, dark mode, accent themes
- Offline local logging

Deferred: AI companion, wearables, partner sharing, pregnancy / TTC modes.

## Demo data

In **You → Load demo history**, load six synthetic cycles to explore a mature Insights / Today state.
