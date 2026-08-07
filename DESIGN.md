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

### Accents (user-selectable)
- Dust Rose `#B87A7A`
- Lavender `#8B7BA8`
- Sage `#7A9278`
- Ocean `#6A8A9A`
- Sand `#B59A78`
- Plum `#8A6A84`

## Typography

System stack (SF Pro / Android system / system-ui). Hierarchy:
- Hero 34–40 / Title 24–28 / Section 18–20 / Body 15–17 / Caption 12–14
- Prefer weight contrast over many sizes; avoid eight sizes on one screen.

## Layout & Components

- Screen padding 20–24
- Card radius 20–24, subtle border, minimal shadow, padding 18–20
- Few cards per screen; Today answers three questions only
- Bottom tabs: Today · Calendar · Insights · You
- Central Log action as floating primary control
- Bottom sheet for quick log
- Soft cycle progress arc (not a medical dashboard chart)

## Motion

Subtle only: sheet present, log confirmation, insight appear, cycle arc fill. Respect reduced motion. No confetti, flowers, or bounce easing.

## Markers (calendar)

- Filled circle = logged period
- Outline circle = predicted period
- Small dot = symptoms logged
- Soft wash = optional fertile window (opt-in)

Never rely on colour alone for bleeding state — pair with text labels.
