# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

delegated: Expo (React Native) + TypeScript + Expo Router + Zustand + Appwrite account-prefs cloud sync with SecureStore/session storage for account-first cross-platform menstrual tracking.

## Users

People who menstruate and want to understand their own cycle patterns, prepare for upcoming periods/symptoms, and notice meaningful changes — without fertility-first messaging or medical diagnosis. Primary context: private daily use on a phone, often evening logging, sometimes sharing a summary with a clinician.

## Product Purpose

Luma is a privacy-first personal menstrual intelligence companion. It helps users know approximately when their next period may arrive, quickly log periods and symptoms, learn what is normal for them, prepare for what may come next, and communicate cycle history to healthcare professionals.

Success means a user can open Today and immediately understand: where they are in their cycle, what usually happens for them here, what may happen next, whether something is different, and what useful action to take.

## Positioning

Most period apps tell you when your next period is. Luma teaches you what your cycle means for you — personal baseline, pattern discovery, change detection, and calm preparation — without diagnosing conditions or overclaiming fertility certainty.

## Capabilities

- Short onboarding (goals, last period, optional period length/regularity/contraception, privacy)
- Period / flow / mood / energy (full scale) / pain with location / symptom / sleep hours / optional LH and mucus / note logging
- Cycle calendar with subtle period/prediction/symptom markers
- Period prediction as a range with data-coverage wording (never a probability or single certain date)
- Personal baseline and recurring pattern insights after enough cycles
- Change detection vs personal history (non-alarming language)
- Period preparation checklist
- 3/6/12-month health summary for clinician visits
- Privacy controls, app lock via device biometrics/passcode, export/delete
- Light and dark appearance; user-selectable muted accents
- In-app due reminders plus native OS scheduling; PWA closed-app banners via Web Push when configured
- Fertility features remain opt-in and non-dominant

## Constraints

- Never diagnose (PCOS, endometriosis, PMDD, pregnancy, infertility, etc.)
- Never present calendar fertility estimates as contraception
- Distinguish correlation from causation in insight copy
- Predictions must use deterministic statistics, not an LLM
- Account-first: health data is saved to the signed-in Appwrite account. A signed-in session that is already hydrated may queue a log on this device when the network is gone, then sync it; nothing is stored for an anonymous visitor
- Offline saves for a signed-in, hydrated session are kept in an account-keyed outbox and visibly reported as pending sync. First load and onboarding still need internet. No anonymous health data is silently uploaded
- Native session credentials use secure storage; browser sessions use session storage; biometric lock and OS notification permission remain device-specific
- No reproductive-data advertising profiles; no selling menstrual data
- Avoid stereotypical pink/flower/"women's app" visual language
- AI companion deferred until personal intelligence engines are trustworthy (Phase 5+)
- Wearables / partner sharing / pregnancy modes are post-MVP

## Voice

Warm, short, reassuring, evidence-informed, nonjudgmental, never dramatic. Prefer may/might/often/appears/estimated/likely. Prefer "different from your recent pattern" over "abnormal."

## Brand Commitments

- Product name: Luma
- Promise: Know your cycle. Understand yourself.
- Privacy is a brand feature, not fine print: "Your cycle belongs to you."
- Visual direction: warm editorial — human and confident, warm first and precise second, with personality carried by craft rather than decoration. Bone background `#F7F2EB` (warm paper), ink background `#16120F` (warm charcoal, never black), paired signal accents in muted pigments (Dust Rose by default, plus Lavender, Sage, Ocean, Sand, Plum), ruled sections, and mono data marks
- **No neon.** High-chroma accents on a dark ground read as developer tooling or an AI product. Every accent is held below neon saturation, and the dark surface is warm charcoal rather than black, so the app reads as a personal journal rather than a dashboard
- Typography is the brand: **Fraunces** display serif for headings, system sans for body, mono for measurements. Serif italic is reserved for the app's warm voice — the user's name, the phase reading, and Luma's replies
- Signature elements: the cycle dial on Today (the month as a ring of blended light, with a handle you hold and glide to read any day), the cycle ribbon that carries the same reading flat on the welcome screen, and the phase aura (a soft field of light that shifts temperature across the cycle)
- Luma answers when you tell it something. Logging a mood returns a short, warm line — never advice, never a diagnosis
- Motion is part of the brand: sections arrive, every press springs, and data draws itself in — always collapsing to an instant final state under reduced motion
- Warmth never becomes cliché: no pink-by-default, no flowers, no infantilising illustration. Not a conventional pink period tracker, and not a generic card dashboard

## Accessibility

Dynamic text, screen readers, high contrast option path, colour-blind-safe indicators (never communicate bleeding by colour alone), large touch targets, clear nontechnical health language.

## Open Decisions

- Appwrite account-prefs sync is the live cloud path (`lumaState`). Project credentials, OAuth/email provider configuration, redirect allowlisting, and native deep-link QA remain release prerequisites. Leftover Supabase wording in older files is not the runtime.
- Exact medical-review thresholds for safety Level 3–4 copy remain template placeholders pending clinical review
- **App lock — policy verified; native authentication unverified.** Implemented against the device's own biometrics/passcode (`expo-local-authentication`). Unlock state is in memory only and never persisted. Where no authenticator is enrolled the setting reports itself unavailable rather than pretending to protect anything. The lock/unlock _decisions_ are covered by unit tests; the OS biometric prompt and app lifecycle integration must be exercised on a real iOS and a real Android device before release
- **Export — implemented and verified on web; native share unverified.** Writes a genuine `.json` / `.csv` file (`expo-file-system`) and hands it to the platform share sheet (`expo-sharing`), deleting the temporary copy afterwards. `expo-sharing` cannot report whether the user actually sent the file, so the UI never claims a send succeeded
- **Notifications — planner, in-app due cards, and `showDetailedText` verified in code; native OS delivery unverified; Web Push needs VAPID + collection + cron.** A pure planner produces the set of reminders that should exist. Native `expo-notifications` reconciles that plan on iOS/Android. The web PWA surfaces the same plan as Today due cards, and can send closed-app banners via Web Push when VAPID keys and a small client-written schedule collection are configured. The cron must never read the `lumaState` health blob. Discreet wording is applied at planning time whenever discreet mode is on **or** detailed lock-screen text is off. Delete and reset cancel native schedules. “Pattern discovered” and “important change” remain in-app only
- Data at rest is protected by device encryption only; app-level encryption of the local store is an open decision

## Release status

| Area                           | Status                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Appwrite account sync          | **Code complete; live project unverified** — credentials, email/OAuth providers, redirect allowlist, and cross-device QA remain                                    |
| Signed-in offline outbox       | **Code complete; PWA QA pending** — hydrated signed-in sessions can save locally and sync later; first load and onboarding still need internet                     |
| Web export                     | **Verified** — real files, correct MIME types, Unicode and CSV escaping, cancel path                                                                               |
| Native share                   | **Unverified** — the file-write → share-sheet → cleanup path has not run on a device                                                                               |
| App lock native authentication | **Unverified** — policy is unit tested; the OS prompt and lifecycle integration are not                                                                            |
| In-app due reminders           | **Verified in unit tests** — `dueFromPlan` keeps today’s items after the hour; Today cards dismiss for the calendar day                                            |
| Notifications native delivery  | **Unverified** — planning and reconciliation are unit tested; nothing has been delivered by a real OS                                                              |
| PWA Web Push                   | **Unverified** — service worker, client schedule upsert, and cron sender are in the repo; needs VAPID keys, Appwrite collection, and an installed Home Screen pass |

Native lock, share, and OS notification delivery need one iOS and one Android
device pass before release. PWA airplane-mode save, Home Screen permission, and
due-card-without-push cases are written in [`NATIVE-QA.md`](./NATIVE-QA.md).
That document is the gate; this table is updated only when it is filled in.

Note: native lock / share / `expo-notifications` do **not** work in Expo Go —
those passes require a development build (`eas.json` profiles are committed).
Web Push and the signed-in outbox are exercised on the HTTPS Home Screen PWA.
