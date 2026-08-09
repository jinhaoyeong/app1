# Luma

Privacy-first personal menstrual intelligence — learn what is normal for _you_, prepare for what may come next, and notice when something meaningfully changes.

> Most period apps tell you when your next period is. Luma teaches you what your cycle means for you.

## Stack

- Expo (React Native) + TypeScript
- Expo Router navigation
- Zustand in-memory health state + Supabase Auth/Postgres cloud sync
- SecureStore session credentials on native; browser session storage on web
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

Before starting, copy `.env.example` to `.env` and provide the existing
Supabase project URL and publishable key. In the Supabase dashboard enable the
email provider, add the web callback URL and `luma://auth/callback` to the Auth
redirect allowlist, and apply the migration in `supabase/migrations/`.
If the project uses Supabase's Data API exposure controls, expose the five Luma
tables there as well; the migration still grants access only to `authenticated`
and applies per-user RLS policies.

Deploy `supabase/functions/delete-account` with the service-role key stored as
an Edge Function secret. That key must never be placed in an `EXPO_PUBLIC_*`
variable or shipped to the client.

Then open iOS Simulator, Android emulator, Expo Go, or press `w` for web.

## Test

```bash
npm test
npm run typecheck
npm run lint
npm run export:web
```

## MVP scope

- Account-first magic-link authentication and cloud hydration
- Short onboarding + privacy commitment
- Today / Calendar / Insights / You + floating Log
- Period, flow, mood, energy, pain, symptoms, notes
- Prediction **ranges** with data-coverage wording (never a probability or single certain date)
- Personal baseline + repeating patterns + change detection
- Possible fertile days, estimated ovulation timing, and possible post-ovulation timing with clear uncertainty
- Period preparation checklist
- Health summary for clinician visits (share/export)
- Privacy controls, discreet mode, device biometric preference, dark mode, accent themes
- Offline saves blocked with “Not saved — internet required”

Deferred: AI companion, wearables, partner sharing, pregnancy / TTC modes.

## Legacy data boundary

Anonymous legacy health data is not uploaded. The account-first store starts
from the signed-in Supabase account and intentionally ignores the previous
`luma-store-v1` health-data key.
