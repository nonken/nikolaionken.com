---
name: Nikolai Onken
description: A builder's years drawn as a tree's growth rings, with the dated work set beside them as plain text.
colors:
  moss: "#2f5a36"
  moss-soft: "rgba(47, 90, 54, 0.35)"
  moss-dark: "#a9c98f"
  moss-soft-dark: "rgba(169, 201, 143, 0.35)"
  ground: "#efe4d2"
  ground-dark: "#1d140e"
  ink: "#2a1c12"
  ink-dark: "#eedfc8"
  ink-soft: "#6b4d36"
  ink-soft-dark: "#b99b7d"
  rule: "rgba(90, 58, 34, 0.18)"
  rule-dark: "rgba(238, 223, 200, 0.14)"
  graphite: "#4b433c"
  graphite-dark: "#efe2cf"
  wood-graphite: "#4b433c"
  wood-moss: "#2f5a36"
  wood-halo: "#f6ecdc"
  band: "rgba(47, 90, 54, 0.42)"
  bark: "#4a2c1a"
  bark-dark: "#573521"
  bark-inner: "#7a4526"
  heartwood-early: "#c2804c"
  heartwood-late: "#8a4a27"
  sapwood-early: "#e6bf8c"
  sapwood-late: "#bf8550"
typography:
  display:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "clamp(2.5rem, 4.4vw, 3.5rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.015em"
  lede:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "lnum"
  body-strong:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 500
    lineHeight: 1.55
  year:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum, lnum"
  label:
    fontFamily: "Alegreya Sans, Gill Sans, Seravek, ui-sans-serif, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  focus: "2px"
  circle: "50%"
spacing:
  gutter: "clamp(1.25rem, 4vw, 4.5rem)"
  column-gap: "clamp(2rem, 5vw, 6rem)"
  measure: "34rem"
  row: "0.7rem"
  row-gap: "1rem"
  year-column: "3.25rem"
  heading-after: "0.875rem"
  section: "4rem"
  colophon: "5rem"
components:
  link:
    textColor: "{colors.moss}"
    typography: "{typography.body}"
  link-dark:
    textColor: "{colors.moss-dark}"
  work-row:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
    padding: "0.7rem 0"
  work-row-name:
    textColor: "{colors.moss}"
    typography: "{typography.body-strong}"
  work-row-year:
    textColor: "{colors.ink-soft}"
    typography: "{typography.year}"
    width: "3.25rem"
  work-row-year-active:
    textColor: "{colors.moss}"
  section-heading:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  caption:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    width: "30rem"
  slice-pin:
    backgroundColor: "{colors.wood-moss}"
    rounded: "{rounded.circle}"
    size: "16px"
  slice-pin-active:
    backgroundColor: "{colors.wood-moss}"
    rounded: "{rounded.circle}"
    size: "24px"
---

# Design System: Nikolai Onken

## Overview

**Creative North Star: "The End-Grain Ledger"**

The site is a sawn log read two ways. On one side, an end-grain cross-section, drawn from a seed, with one growth ring per year since 2008. Heartwood sits at the centre and pale sapwood at the edge, inside a rough bark rim. A graphite pencil core line runs from the pith out past the bark, ticking off the years. On the other side is a ledger: the name, one line about the person, the current role, and the dated work as a plain ruled list. The drawing carries the warmth and the art. The text carries the facts and is readable right away, with nothing to discover first.

The density is low and the tone is quiet. It is one warm paper ground and one humanist sans in a few sizes. The only accent is moss green, and it always means the same thing: this is live, this links, this is the year you are pointing at. The ledger and the drawing are linked. Hovering a work row lights its ring band and grows its pin. Hovering a pin puts that project's year and name on the wood. The outermost ring is the current year. Its green latewood arc is drawn only as far round as the calendar has come.

The build rejects the full-screen gimmick and the bare résumé page. The art sits beside the text. It never takes over the viewport, and nothing gates the content.

**Key Characteristics:**
- Two columns on desktop: the sticky slice on the left (1.35fr), the text column on the right (1fr, 34rem measure). One column below 860px, with the slice on top.
- One typeface (Alegreya Sans) at weights 400 and 500, plus italic. There is no second face, no uppercase, and no letter-spaced labels.
- Moss is the only accent. Every other colour is paper, ink or wood.
- Flat paper with no shadows. All depth lives inside the drawing (grain, rays, halos).
- Motion happens once, at load: the slice grows from the pith outward, then the current year's arc draws on. Reduced motion shows the finished state.

## Colors

Warm unbleached paper with brown-black ink and a single moss green, beside a copper-and-walnut wood slice whose colours stay the same in both themes.

### Primary
- **Moss** (`moss`; `moss-dark` in dark mode): the one accent. It is used for text links and their underline (at `moss-soft`, 35% alpha, turning solid on hover), the active work year, the text selection background, the focus outline, and, as `wood-moss`, the project pins and the growing-year arc on the slice. In dark mode the text-side moss lightens to a pale sage (`moss-dark`) so links stay legible, while the pins and the arc keep the deep `wood-moss`.
- **Year Band** (`band`, moss at 42% alpha): fills the whole ring of the year you are pointing at. It appears only while a row or pin is active.

### Neutral
- **Unbleached Paper** (`ground` / `ground-dark` Charred Walnut): the page background, the halo stroke behind slice labels, and the `theme-color`. Dark mode swaps it for a near-black brown, never a neutral grey.
- **Walnut Ink** (`ink` / `ink-dark` Parchment): headings, the name, the lede, and project names that have no link.
- **Faded Ink** (`ink-soft` / `ink-soft-dark`): years, project notes, the caption, the colophon, the "now" line, and the scrollbar thumb. It reaches 6.1:1 on paper and 6.9:1 on the dark ground.
- **Hairline** (`rule` / `rule-dark`): 1px rules above, between and below the work rows. This is the only line in the text column.
- **Graphite** (`graphite` / `graphite-dark`): the part of the pencil core line past the bark, and the current-year numeral at its end. Both sit off the wood on the ground, so they flip with the theme.

### Wood (material palette)
- **Bark** (`bark`; `bark-dark` in dark mode) and **Inner Bark** (`bark-inner`): the rough outer rim, the drying check, and the pith dot. The bark is lifted slightly in dark mode so the rim still reads against the dark ground.
- **Heartwood** (`heartwood-early` copper, `heartwood-late` rust-brown) and **Sapwood** (`sapwood-early` pale straw, `sapwood-late` tan): the earlywood and latewood of each ring. The last six rings blend from heartwood to sapwood (see rings.js). These colours are computed per ring, not set by hand.
- **Wood Graphite** (`wood-graphite`) and **Wood Halo** (`wood-halo`): the pencil core line, its ticks and year labels, and the pale ring around each pin and the arc tip.

### Named Rules
**The One Green Rule.** Moss is the only accent, and it only ever marks something live: a link, a pin, the active year, the growing arc, selection or focus. Nothing decorative is green.

**The Wood Doesn't Change Rule.** The slice and every mark drawn on it (pins, core line, arc, band) keep one palette in both themes. Only the paper, the ink and the marks drawn on the paper change. New marks on the wood take `wood-*` tokens. New marks on the paper take the theme tokens.

**The Paper-Not-Grey Rule.** Every neutral is a warm brown. The ground is paper or charred walnut, never a neutral grey or pure black or white.

## Typography

**Display Font:** Alegreya Sans (with Gill Sans, Seravek, ui-sans-serif)
**Body Font:** Alegreya Sans (the same family)

**Character:** A humanist sans with calligraphic roots. At 500 weight it is warm without being bookish, and its italic does the work a second typeface usually would.

### Hierarchy
- **Display** (500, clamp(2.5rem, 4.4vw, 3.5rem), line-height 1, -0.015em): the name only, once per page.
- **Lede** (400, 1.375rem, 1.4, balanced wrap): the one-line self-description under the name.
- **Title** (500 italic, 1.375rem, 1.2): section headings ("Work", "Elsewhere"). It is the same size as the lede, and the italic is what makes it a heading.
- **Body** (400, 1.1875rem / 19px, 1.55, lining numerals; 1.125rem below 860px): work notes and the "now" line. Project names use the same size at 500.
- **Year** (400, body size, tabular and lining numerals): the work-list year column, so the years line up.
- **Label** (400 or italic, 0.9375rem): the figure caption (italic, 1.4, balanced, centred, max 30rem) and the colophon.
- **Slice annotation** (SVG, in viewBox units): the pencil year labels are 27px, 500 italic, drawn in `wood-graphite` over a 5px `wood-halo` stroke at 50% opacity. Below 860px they grow to 44px and only the first year is kept. The pin label is 30px/500 in `ink`, with the year in 400 italic `ink-soft`, and it has a 7px `ground` halo stroke drawn under the fill.

### Named Rules
**The One Family Rule.** Everything is Alegreya Sans. Hierarchy comes only from size, weight (400/500) and italic. Do not add a second face, a mono, uppercase or tracking.

**The Italic-Annotates Rule.** Italic is the voice of annotation: section headings, the caption, the year labels on the wood, and the year in a pin label. Italic is not used for emphasis in running text.

## Layout

A two-column grid (`minmax(0, 1.35fr) minmax(0, 1fr)`) sits inside a 96rem container. The side gutter is `gutter` and the columns are separated by `column-gap`. The art column is `position: sticky` at full viewport height (100dvh), with the slice centred at `min(100%, 86vh)`, so the drawing stays in view while the ledger scrolls. The text column is capped at the `measure` (34rem). Its top padding is clamp(4rem, 16vh, 10rem), which lines the name up near the visual middle of the slice.

The vertical rhythm is simple. The lede sits 1.25rem below the name and the "now" line 0.5rem below that. Section headings open with `section` (4rem) above and `heading-after` (0.875rem) below. Work rows are a two-column grid (`year-column` 3.25rem, then 1fr) with a 1rem gap and `row` (0.7rem) padding above and below, divided by hairlines. When several projects share a year, the repeated year is hidden (`visibility: hidden`) so its slot is kept and the column stays aligned. The Elsewhere links sit on one wrapping row (0.5rem × 1.75rem gaps). The colophon sits 5rem below.

**Responsive (one breakpoint, 860px):** the grid becomes one column and the art stops being sticky. The slice sits on top at `min(90%, 28rem)`, with 2rem above it. The text gets 3rem of padding above and below, section spacing drops to 3rem, and body text drops to 1.125rem. On the slice, the minor year labels and the current-year numeral are hidden and the remaining label is enlarged.

### Named Rules
**The Beside-Not-Behind Rule.** The art sits beside the text on desktop and above it on mobile. It never sits behind the text or fills the viewport, and the text never waits on it.

## Elevation & Depth

The page is flat paper. There are no box-shadows, cards or layered surfaces anywhere. The text column uses only hairline rules. All depth is inside the drawing, and it is made from material, not lighting. A fractal-noise grain filter sits over the wood at 55% opacity. Thin pale medullary rays run across the rings. The bark carries dark and light fissure strokes. A drying check cuts in from the rim. Separation between marks and wood comes from halos, not shadows: pins and the arc tip have a 3px `wood-halo` ring, and the pin label is drawn over a 7px `ground` stroke.

### Named Rules
**The Flat Paper Rule.** Nothing on the paper casts a shadow. When a mark on the drawing needs lifting, give it a halo stroke in a paper tone.

## Shapes

There are two form languages and they don't mix. The text column is all straight lines and square corners: hairline rules and unboxed text. The only radius is the 2px on the focus outline. The drawing is all organic closed curves. The rings are wobbled circles made from shared harmonics plus per-ring jitter, and they are eccentric (the centre drifts outward, as in a real trunk). The bark edge is rough from seeded value noise. The pins are true circles. The core line has round caps. The small outbound arrow is a hand-drawn 12-unit stroke glyph with round caps and joins, at 55% opacity.

### Named Rules
**The Grown-Not-Drawn Rule.** Curves on the drawing come from the seeded geometry (rings.js, seed 20080101), so the slice is identical on the server and the client. Do not hand-place or hand-tune ring shapes.

## Components

### Links
Quiet, underlined, and always moss.
- **Style:** `moss` text with a 1px `moss-soft` underline, offset 0.22em.
- **Hover:** the underline turns solid (`currentColor`) over 160ms ease-out.
- **Focus:** 2px solid moss outline, offset 3px, with a 2px radius.
- **Outbound:** every external link ends in the small diagonal arrow (0.62em, 1.4 stroke, 55% opacity). On hover or focus it goes to full opacity and nudges up and to the right by 0.08em (200ms, cubic-bezier(0.16, 1, 0.3, 1)).

### Work Row (the ledger)
A dated line item, newest first, which reads the same way as the rings from the bark inward.
- **Structure:** the year sits in the tabular column, then the project name (500; a moss link when there is a URL, otherwise ink) and an optional `ink-soft` note on the same line, with pretty wrap.
- **Dividers:** `rule` hairlines above the list and below each row. There is no background fill and no radius.
- **Active (hover or focus):** the year turns moss (200ms), the matching ring band fades in on the slice (220ms), and the pin grows from r 8 to r 12. Leaving the list clears it.

### Section Heading
500 italic at the lede size, in ink. It has no rule, number or label above it.

### Growth-Ring Slice (signature)
A 1000×1000 SVG figure. In order: the bark and its fissures, the inner bark, the ring discs (latewood under earlywood), grain and rays clipped to the wood, the check, and the pith. On top of that come the year bands, the growing-year arc, the pencil core line with its ticks and labels, the pins, and the active label.
- **Rings:** there are seven thin juvenile rings, then one ring per year from 2008. Every fifth year, the first year and the last year get long ticks (16 units); the others get short ones (9). Only 2008, 2013 and 2018 are labelled, along with the current year at the end of the line.
- **Growing year:** the current ring has no dark latewood yet. A 4-unit moss arc starts at 12 o'clock and runs as far as the year has progressed. The rest of the circle is a dotted graphite path, and a haloed moss dot marks the tip.
- **Pins:** there is one per project, placed in the middle of its year's band and spread by the golden angle. Pins are nudged away from the core line and the check.
- **Caption:** a centred italic line under the slice that states what the rings mean and how far round the current year is. It is the drawing's legend.
- **Accessibility:** the SVG is `role="img"` with a `<title>` that describes the whole cross-section.

### Motion
- **Grow** (1800ms, cubic-bezier(0.16, 1, 0.3, 1)): a circular clip scales from 0.02 to 1 around the pith.
- **Draw** (1100ms, same curve, 900ms delay): the current-year arc strokes on.
- **Settle** (700ms ease-out, 1300ms delay): the pencil line, pins, dotted rest and tip fade in.
- State transitions take 160 to 220ms with ease-out. All load animation sits behind `prefers-reduced-motion: no-preference`.

### Named Rules
**The Two-Way Pointer Rule.** Every item in the ledger has one pin on the wood, and pointing at either one lights the other. A new dated item must get a pin and a band. A new mark on the wood must correspond to a real, dated fact.

**The Pith-Outward Rule.** Motion only tells the story of growth: once, at load, from the centre outward. There are no scroll effects, loops or ambient motion.

## Do's and Don'ts

### Do:
- **Do** keep moss as the only accent, and use it only for live things: links, pins, the active year, the growing arc, focus and selection.
- **Do** draw new marks on the wood with the `wood-*` tokens so they look the same in both themes, and give them a `wood-halo` or `ground` halo stroke where they cross the grain.
- **Do** set every year in the text column with tabular lining numerals, and hide a repeated year with `visibility: hidden` so the column holds its place.
- **Do** keep text to a 34rem measure, at 19px/1.55 on desktop and 18px below 860px.
- **Do** generate any new geometry from the seeded generator in rings.js, so the server and client renders match.
- **Do** put load motion behind `prefers-reduced-motion: no-preference` and keep it as growth from the pith.

### Don't:
- **Don't** add a second typeface, uppercase labels, letter-spaced eyebrows, or a mono for the years.
- **Don't** put box-shadows, cards, rounded containers or tinted panels on the paper. The text column is hairlines and type only.
- **Don't** let the slice fill the viewport, sit behind the text, or hold back any content.
- **Don't** use a neutral grey, pure black or pure white. Every neutral is a warm brown.
- **Don't** add decorative green. If it's moss, it's interactive or it marks the current year.
