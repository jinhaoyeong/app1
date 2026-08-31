# Luma

Privacy-first personal menstrual intelligence — learn what is normal for _you_, prepare for what may come next, and notice when something meaningfully changes.

> Most period apps tell you when your next period is. Luma teaches you what your cycle means for you.

## Stack

- Expo (React Native) + TypeScript
- Expo Router navigation
- Zustand in-memory health state + Appwrite account-prefs cloud sync (`lumaState`)
- SecureStore session credentials on native; browser session storage on web
- Deterministic cycle / prediction / pattern / change engines
- Signed-in outbox for offline log-then-sync (no anonymous health cache)
- In-app due cards; native `expo-notifications` on iOS/Android; PWA Web Push when configured

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

Before starting, copy `.env.example` to `.env` and provide the Appwrite
endpoint and project id. Optional Web Push needs `EXPO_PUBLIC_VAPID_PUBLIC_KEY`,
an Appwrite database/collection for the push schedule only (never the health
blob), and server-side `VAPID_PRIVATE_KEY` plus `APPWRITE_API_KEY` for the
Vercel cron at `/api/push-dispatch`.

Then open iOS Simulator, Android emulator, Expo Go, or press `w` for web.
The primary visitor surface is the iOS Safari Add to Home Screen PWA.

## Test

```bash
npm test
npm run typecheck
npm run lint
npm run export:web
```

## MVP scope

- Account-first authentication and cloud hydration (Appwrite)
- Short onboarding + privacy commitment
- Today / Calendar / Insights / You + floating Log
- Period, flow, mood, energy, pain (with location), symptoms, sleep hours, optional LH/mucus, notes
- Prediction **ranges** with data-coverage wording (never a probability or single certain date)
- Personal baseline + repeating patterns + “what usually happens in the next few days”
- Possible fertile days, estimated ovulation timing, and possible post-ovulation timing with clear uncertainty
- Period preparation checklist
- Health summary for clinician visits (share/export)
- Privacy controls, discreet mode, device biometric preference, dark mode, accent themes
- Signed-in offline outbox with a pending-sync banner; first load still needs internet
- In-app due reminders; native OS scheduling; PWA Web Push when VAPID is configured

Deferred: AI companion, wearables, partner sharing, pregnancy / Conceive modes, daily pill reminders.

## Legacy data boundary

Anonymous legacy health data is not uploaded. The account-first store starts
from the signed-in Appwrite account and intentionally ignores the previous
`luma-store-v1` health-data key. Device lock prefs stay in `deviceStore`.
