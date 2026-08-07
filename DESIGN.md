# Design System — Luma

<!-- impeccable:design-schema 1 -->

## World

Quiet personal health journal. Soft paper-like surfaces, restrained colour, generous whitespace, one useful thought at a time. Operate mode throughout: scanability and calm trust over marketing expression.

## Colour

### Light
- background: `#FAF9F7`
- surface: `#FFFFFF`
- surfaceMuted: `#F3F1ED`
- text: `#161616`
- textSecondary: `#707070`
- textTertiary: `#9A9A9A`
- border: `#E8E4DE`
- period: `#8B5E5E` (understated, not bright red)
- predicted: `#C4B5A5`
- fertile: `#A8B5A0` (only when fertility enabled)
- warningSoft: `#8A6A4A`

### Dark
- background: `#111111`
- surface: `#1A1A1A`
- surfaceMuted: `#222222`
- text: `#F2EDE6`
- textSecondary: `#A3A3A3`
- textTertiary: `#757575`
- border: `#2A2A2A`

### Accents (user-selectable, AA-tuned)
Dust Rose `#8E5555` · Lavender `#6A5A88` · Sage `#4F684D` · Ocean `#456A78` · Sand `#8A6B45` · Plum `#6A4E66`

Selected chips use a soft accent tint with dark text (not white-on-accent) for contrast.

## Typography

System stack (SF Pro / Android system / system-ui). Hierarchy:
- Hero 34–40 / Title 24–28 / Section 18–20 / Body 17 / Caption 12–14
- Prefer weight contrast over many sizes; avoid eight sizes on one screen.
- Text allows Dynamic Type scaling (capped for layout safety).

## Layout & Components

- Screen padding 20–24
- Card radius 20–24, subtle border, minimal shadow, padding 18–20
- Few blocks per screen; Today answers one primary question before the fold
- Bottom tabs: Today · Calendar · Insights · You
- Central Log action as floating primary control (labeled “Log”)
- Progressive disclosure on Log (flow + mood first)
- Soft cycle progress arc (not a medical dashboard chart)
- Prefer spacing/dividers over stacked equal-weight cards on Today
- Onboarding shows step progress (1–6)
- Contextual Explain for phases, confidence, and estimates
- Goals subtly reshape Today emphasis (prediction vs patterns vs learning)

## Motion

Subtle only: sheet present, log confirmation, insight appear, cycle arc fill. Respect reduced motion. No confetti, flowers, or bounce easing.

## Markers (calendar)

- Filled circle = logged period
- Outline circle = predicted period
- Small dot = symptoms logged
- Soft wash = optional fertile window (opt-in)

Never rely on colour alone for bleeding state — pair with text labels.
