# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

delegated: Expo (React Native) + TypeScript + Expo Router + Zustand + AsyncStorage local-first persistence — matches the product specification for cross-platform iOS-first menstrual tracking with offline logging.

## Users

People who menstruate and want to understand their own cycle patterns, prepare for upcoming periods/symptoms, and notice meaningful changes — without fertility-first messaging or medical diagnosis. Primary context: private daily use on a phone, often evening logging, sometimes sharing a summary with a clinician.

## Product Purpose

Luma is a privacy-first personal menstrual intelligence companion. It helps users know approximately when their next period may arrive, quickly log periods and symptoms, learn what is normal for them, prepare for what may come next, and communicate cycle history to healthcare professionals.

Success means a user can open Today and immediately understand: where they are in their cycle, what usually happens for them here, what may happen next, whether something is different, and what useful action to take.

## Positioning

Most period apps tell you when your next period is. Luma teaches you what your cycle means for you — personal baseline, pattern discovery, change detection, and calm preparation — without diagnosing conditions or overclaiming fertility certainty.

## Capabilities

- Short onboarding (goals, last period, optional period length/regularity/contraception, privacy)
- Period / flow / mood / energy / pain / symptom / note logging (fast, customizable)
- Cycle calendar with subtle period/prediction/symptom markers
- Period prediction as a range with confidence (never a single certain date)
- Personal baseline and recurring pattern insights after enough cycles
- Change detection vs personal history (non-alarming language)
- Period preparation checklist
- 3/6/12-month health summary for clinician visits
- Privacy controls, discreet notifications mode, biometric lock preference, export/delete
- Light and dark appearance; user-selectable muted accents
- Fertility features remain opt-in and non-dominant

## Constraints

- Never diagnose (PCOS, endometriosis, PMDD, pregnancy, infertility, etc.)
- Never present calendar fertility estimates as contraception
- Distinguish correlation from causation in insight copy
- Predictions must use deterministic statistics, not an LLM
- Local-first: health data stays on device unless sync is intentionally enabled
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
- Visual direction pinned by brief: quiet, premium, warm, human, clean; soft off-white `#FAF9F7`; muted selectable accents (Dust Rose, Lavender, Sage, Ocean, Sand, Plum); dark mode near `#111111`
- Think Apple Health / Linear / Notion / Headspace — not a conventional pink period tracker

## Accessibility

Dynamic text, screen readers, high contrast option path, colour-blind-safe indicators (never communicate bleeding by colour alone), large touch targets, clear nontechnical health language.

## Open Decisions

- Backend sync (Supabase) deferred; MVP is local-first on device
- Exact medical-review thresholds for safety Level 3–4 copy remain template placeholders pending clinical review
- Biometric lock uses preference + secure flag in MVP; platform biometric APIs wired where available
