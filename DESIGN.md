# Design System: Luma

<!-- impeccable:design-schema 1 -->

## World

Warm editorial. A private companion that happens to be rigorous: bone and ink surfaces lit by a soft phase aura, a characterful display serif, hairline section rules, and mono data marks — with one signature piece of light, the cycle dial, that makes the body's rhythm visible at a glance and readable day by day under the thumb.

Three defaults are rejected: the soft pink tracker, the generic card dashboard, and the cold instrument panel. Luma is made for people who menstruate and often open it in the evening, sometimes while feeling awful. So it is warm first and precise second — it greets you by name, tells you where you are in your own words, and answers when you tell it something.

Warmth is carried by craft, never by cliché. **No pink-by-default, no flowers, no infantilising illustration.** The femininity of this product is in its typography, its light, and its manners.

Direction: **warm editorial with a pulse**.

## Colour

### Light — "Bone"

- background: `#F7F2EB` (warm paper, not cool grey)
- surface: `#FDFAF6` · surfaceMuted: `#EDE5D9` · surfaceRaised: `#FFFFFF`
- text: `#1E1815` · textSecondary: `#5C534C` · textTertiary: `#877C73`
- border: `#E2D9CC` · borderStrong: `#C8BCAC`
- period: `#AF4A40` · periodDeep: `#8C3630` · predicted: `#6A7590` · fertile: `#4E7A5E`
- warningSoft: `#8F6528` · successSoft: `#5F7A4A`
- phases — menstrual `#6F2725`/`#8F332E` · follicular `#AF453A`/`#C95B4B` · fertile `#DD7562`/`#EC927E` · luteal `#9F3B33`/`#D26655`

### Dark — "Ink"

**Warm charcoal, never black.** The ink ground was once `#0C0D0A` — effectively pure black with a green cast — which made the whole app read as a terminal. Lifting it and pushing the hue warm turns the same layout into low lamplight.

- background: `#16120F` · surface: `#1E1916` · surfaceMuted: `#29221E` · surfaceRaised: `#332B26`
- text: `#F4EDE6` · textSecondary: `#B5AAA1` · textTertiary: `#8B8078`
- border: `#332B26` · borderStrong: `#463C35`
- period: `#DE8A7C` · periodDeep: `#A85043` · predicted: `#A9B3C9` · fertile: `#8FB69C`
- phases — menstrual `#9F524D`/`#BC5C54` · follicular `#D96B5E`/`#EF7D6C` · fertile `#FF947F`/`#FEB3A2` · luteal `#CB6358`/`#F78774`

`periodDeep` exists for large filled shapes like the ribbon. `period` has to stay legible as small text, which caps how dark it can go; the ribbon needs to go darker than that.

### Phase colour is one red, and never the accent

**Phases are told apart by depth within the period's own family, never by hue.** Three versions of this got it wrong before it got it right, and the wrong ones are why the rule reads the way it does:

1. Arcs drawn from the selected accent. On Dust Rose the ring was three shades of one pink, and the app read as a single-colour product.
2. Phases spread around the hue wheel — terracotta, ochre, teal, violet. Separated perfectly, and to get the ochre past a 3:1 floor it had to be darkened to `#856739`, barely half the chroma of the red beside it. Red, mud, and grape.
3. The same idea, tuned: brick, gold, sea, indigo. Legible, coherent, and wrong for this app — **a ring that runs gold to blue reads as a chart of something. A period tracker bleeds red.**

The ring is now one ramp, built in OKLCH at hue 25–34, walking lightness from the deepest bleeding tone up to the palest mid-cycle point and back down toward the seam. Chroma is held between 0.10 and 0.145 — the band the app's own `period` (`#AF4A40`, 0.134) already occupies. The arc order is the cycle's own shape: deepest while bleeding, palest around the fertile window, closing back down as the next period approaches.

The rules in `__tests__/phase-palette.test.ts`:

- **the ring travels** — deepest to palest is at least 3:1, or depth stops distinguishing anything
- **nothing sinks into the page** — every tone clears 1.9:1 against its ground, and the deepest clears 3:1
- **it stays one family** — no more than 25° of hue across the whole ramp. This is the inverse of what the file used to assert, and it is deliberate
- **no tone goes chalky** — OKLab chroma at or above 0.085. Building the ramp by interpolating toward a pale colour in plain RGB drops it to 0.06, which is exactly where the dusty-brown version came from
- the soft end of each phase is lighter than its deep end, so arcs blend outward
- **the seam stays visible** at 1.4:1, so a restarting cycle is not hidden

Because hue no longer separates the phases, that work is carried by lightness, by the notch at every boundary, and by the phase being named in the middle of the ring. Blending itself happens in plain sRGB — inside one hue family there is nothing for a fancier space to fix.

Still pigments, still nowhere near neon. If a swatch looks like it could belong to a crypto dashboard, it is wrong.

**Phase colour reaches everywhere the cycle is drawn** — the dial, the onboarding ribbon, the cycle map's timing rows, the calendar's period and fertile marks, and the aura behind Today and Insights. Since the ramp is one family, the aura changes in _depth_ rather than in hue across the month: deep and close while bleeding, pale around the fertile window, settling again toward the next period. The accent keeps today's ring, the symptom dot, buttons, and the third bloom of the aura, so choosing a different accent still visibly changes the app.

A cycle we have not learned yet gets no pigment — `unknown` falls back to the accent rather than being given a confident colour.

### Accents (user-selectable)

Each accent ships as a **pair** — a base and a glow — so the cycle ribbon, washes, and marks can blend rather than sit flat. Every accent carries a one-word mood shown beside its swatch. **Dust Rose is the default**: the first thing anyone sees should be warm.

**No accent may reach neon saturation.** A high-chroma accent on a dark ground — lime, cyan, electric violet — is the visual signature of developer tooling and AI products, and it is the wrong register entirely for something opened in bed at the end of a bad day. These are pigments: terracotta, dusty mauve, real sage (grey-green, never chartreuse), weathered teal, ochre, dried plum. If a swatch looks like it could belong to a crypto dashboard, it is wrong.

Dust Rose (warm, close) · Lavender (quiet, dusk) · Sage (grounded) · Ocean (clear, cool) · Sand (low sun) · Plum (deep, still)

Accents tint actions, marks, and washes only — **never the phase arcs**, which carry their own fixed palette. **Bleeding is always paired with a label** — flow is additionally encoded as a four-step intensity mark, so the scale is legible without colour.

## Typography

A three-voice system. The pairing is the single biggest carrier of warmth.

- **Fraunces** (display serif) for display, hero, title, and section. Soft, high-contrast, characterful — it does the work a system sans cannot, and it is why the app reads as made rather than generated. Custom families name their own weight, so these styles never set `fontWeight`.
- **System sans** for body, labels, captions, and all UI chrome. Native-feeling and maximally legible at small sizes.
- **Mono** (Menlo / system monospace) for every measurement, date range, count, and data-coverage figure. Data reads as instrument output; prose reads as prose.

Scale: Display 62/62 · Hero 40/44 · Title 27/33 · Section 19/26 · Body 16/24 · Label 14/19 · Caption 13/18 · Eyebrow 11/14 +1.7 caps · Mono 12/16.

**Serif italic** (`heroItalic`, `bodyItalic`) is the app's voice of warmth: the user's name in the greeting, the phase reading, and every reply Luma gives. Reserve it for those — it stops being warm if it is everywhere. Cycle measurements use tabular figures.

## Warmth and voice

The difference between a tracker and a companion is whether anything answers.

- **The greeting is the first thing on Today** — "Good evening, _Mia._" with the name in serif italic, then one line naming the phase in plain language ("The quieter part of your cycle").
- **Mood replies.** Choosing a mood produces a short serif-italic line — "Okay is a perfectly good day to have", "Noted. Be gentle with yourself today." Warm, brief, never advice, never dramatic, and never a diagnosis.
- **The mood row is a scale, not five words**: a rising mark above each label so the row is readable at a glance.
- Copy in `src/data/voice.ts`. Keep it short enough to read without effort on a bad day.

## The phase aura

A soft field of light behind the top of Today (and lighter on Insights) built from three overlapping radial blooms. The two leading blooms are the **current phase's pigment** — soft in front, deep behind it for depth — and the third is the accent, so the screen's temperature is set by where you are in the cycle while the accent still colours the room. It used to bloom in the accent alone, weighted toward the period tone while bleeding, which is precisely why every screen in every week looked the same pink.

Rules: centres sit off-canvas so the page reads as lit from beyond the edge rather than stained; opacity stays around a third, past which it becomes a muddy gradient; and it is purely decorative, so it is hidden from screen readers and never carries information.

## Layout & Components

- Screen padding 20–32; content caps at 720 (task pages) or 1600 (Today). On a wide window the greeting and cycle day sit in one intro block; the dial and cycle map share the row beneath.
- **Section rhythm**: eyebrow + hairline rule + optional trailing data mark. This replaces card stacking as the primary structure. Cards are used sparingly, for genuinely grouped panels.
- Radii: 6 / 10 / 14 / 20 / 28 / 36 / full. Buttons and chips are full-radius; grouped panels are 28–36 with inner padding of 32 so copy sits inside the curve, not against it.
- Tab screens clear the Dynamic Island: phone web floors a missing top inset to 59pt, then adds 32pt of air so eyebrows are not kissing the hardware. Wide web skips that floor — a desktop window already has browser chrome, and the island padding reads as empty sky.
- Hairline borders, no decorative shadows — except the floating tab dock, which is the one raised object.
- **Tab dock**: a floating capsule of four destinations with a tinted pill that springs to the active tab, set beside a single accent Log button. Navigation and the primary action never compete.
- **Cycle dial** (signature, Today): the whole month bent into a ring, cycle day one at twelve o'clock, running clockwise. **The centre of the ring holds the answer** — cycle day at display scale, the date, and the phase you are in, named beside its own colour swatch. Nothing that belongs to a day is repeated below the ring: under it sits the phase's one-line note, then a single row pairing what is logged with the action to log it, then a pattern line only when there is a pattern to report. Under the phase name the centre gives that phase's **span in cycle days**, so the ring answers not just "which phase" but "how long it runs".

Under the ring sits the **phase index**, open by default. It is not a legend: every phase with its swatch, its name and note, its span in cycle days, and its span in real dates — because a ring is counted in cycle days and a calendar is read in dates, and the dial should answer both. It opens by default because collapsed it may as well not exist; the `PHASES` toggle is there to win the height back. The phase stays named in the ring whether the index is open or shut, so no colour is ever unlabelled.

**A missing phase is stated, never merely absent.** With fertility off there is no fertile or ovulation arc on the ring, and nobody can be expected to notice a colour that was never drawn — so the index says in as many words that possible fertile days and estimated ovulation timing are not shown for this cycle context. Phase arcs separated by gaps rather than by hue alone, a day scale ticked inside the band, a thin outer rail carrying how far through the cycle you are, a fixed dot on today, and a handle you can hold and glide to read any day. **The band is continuous.** Phases used to be three solid arcs with a gap between each, so the ring changed colour at a hard edge. Each phase now holds its own colour across the middle of its span and fades into its neighbour across the ground between them, drawn as short arcs stepped along a ramp because SVG has no angular gradient. Two things survive that change: the seam at twelve o'clock stays a real gap, because a ring has no other way to show where a cycle restarts, and every internal boundary carries a **notch** across the band — so a boundary is still findable without relying on hue. **The ring is an instrument, not a decoration:** inner dots mark days logged this cycle, outer hashes mark days that fall inside a repeating pattern window, and the readout under the handle names the phase in one short line, then that day's log and whether anything is repeating — or a quiet empty. Opening or logging that day is one tap. The gap at twelve o'clock is double width and the last phase stops short of the period tone, because on a ring the last day sits against the first and two blocks of the same deep red would hide where a cycle restarts.

- **Cycle ribbon** (onboarding): the same reading laid out flat, for the fixed non-scrolling welcome layout where a ring would not fit. One continuous band where each phase blends into the next, week ticks for scale, notched phase boundaries, and a labelled marker that draws itself to today. The notches matter — a warm accent like Dust Rose sits close to the period signal, and the segments must stay distinguishable regardless of hue.
- **Flow selector**: five tiles showing a four-step intensity mark, so "how much" is legible before the label is read.
- **Quick mood** on Today writes straight to the store — the shortest path to a log is zero screens.
- **Option rows** carry long-labelled choices (onboarding goals) instead of a chip cloud, which collapses to one pill per line on a phone anyway. Chips stay for short labels, where several fit a row.
- Every tappable control is at least 44pt with a clear accessibility label.

## Phone-first rules

The phone is the design target; wide layouts are the adaptation, not the reverse. Verified at 320 / 360 / 390 / 430pt.

- **Breakpoints**: `< 360` is compact (tighter gutters, smaller tab and flow-tile labels); `< 380` shrinks calendar tiles; `>= 860` places the dial beside the cycle map, under the greeting and cycle day.
- **Never truncate a label to preserve a layout.** The dial and the ribbon both use a wrapping legend rather than labels pinned to each segment, because a narrow phone cannot give "Winding down" the width its segment implies. Legend colour is a 32×18 chip with a hairline edge — pale earlier-cycle washes sit on bone paper, and a 3px dash of the same hue disappears.
- **A scrubber must not reflow the card it lives in.** The dial's "today" chip stays mounted and merely fades, so arriving at a different day never shifts the layout under the finger that caused it.
- **Long sentences get their own line.** Today's phase reading sits under its eyebrow, not beside it.
- Eyebrow labels stay short enough to hold one line in their column (`bleeding`, not `avg bleeding`; `logged`, not `days logged`).
- The Log sheet's footer is in normal flow inside a `KeyboardAvoidingView`, so Save stays reachable while the note field is focused.
- **Entrance animations must never be load-bearing.** `Reveal` and `useDrawIn` both arm a timeout that snaps to the resting state, so a stalled frame driver can never leave a screen half-transparent or a data mark reading zero.

## Motion

Purposeful, and now with a house feel:

- **Arrival** — sections fade and rise 14px, staggered 55ms top-to-bottom (`Reveal`).
- **Response** — every tappable surface springs down on touch and releases on lift (`PressableScale`). One press feel across the whole app.
- **Data draws itself in** — the ribbon marker, range rails, progress fills, and cycle bars animate from zero on mount (`useDrawIn`). The dial's handle travels the same way, from cycle day one round to today, and the readout counts up with it.
- **Direct manipulation runs on the UI thread** — the dial's handle tracks the finger through a Reanimated shared value so the drag never lags behind. Progress is counted in turns, not clamped at 360°, so a glide can cross twelve o'clock and keep going; the day readout wraps with it, and the handle does not unwind. The day underneath snaps a step at a time and releases onto a whole day. Native iOS plays a selection tick on each day and a firmer impact when a lap restarts; Android uses a light/medium impact. On iPhone Add to Home Screen the switch clip uses the same evenodd relative arcs Safari already ticked, with a join on each period day and logged-day dot instead of at twelve and six o'clock. Android web uses the Vibration API.
- Reduced motion collapses all of it to an instant, correct final state.
- No confetti, no bounce overshoot, no flowers.

## Information architecture

- **Today**: masthead → days-until-window at display scale → cycle dial with today marked and any day readable → one useful read → quick mood + log → one small preparation.
- **Calendar**: editorial month header, tile grid (filled = logged period, dashed = estimated window, dot = symptoms), then numbered cycle history.
- **Insights**: baseline panel with range rail and four metrics → recent cycle bars with an average line → patterns with strength meters → changes → comparison → health summary.
- **You**: profile with three live stats → grouped account, tracking, appearance, notification, and privacy settings.
- Secondary pages share one `DetailFrame`; onboarding shares one `OnboardingFrame` with a filling step rule.

## Markers (calendar)

- Filled tile = logged period
- Dashed outline = estimated window
- Accent ring + accent numeral = today
- Dot beneath = symptoms logged

Never rely on colour alone for bleeding state. Every marker is named in the legend and in the day's accessibility label.

## Accessibility

Dynamic text, screen readers, colour-blind-safe indicators, 44pt targets, reduced-motion support, and plain non-technical health language throughout.
