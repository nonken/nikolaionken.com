---
name: Nikolai Onken
description: A type-first personal page in one serif on warm paper, signed with a small growth-ring mark that fills as the year passes.
colors:
  moss: "#2f5a36"
  moss-dark: "#a9c98f"
  moss-soft: "rgba(47, 90, 54, 0.32)"
  moss-soft-dark: "rgba(169, 201, 143, 0.32)"
  ground: "#f4eee4"
  ground-dark: "#1a1511"
  ink: "#221a14"
  ink-dark: "#ece2d4"
  ink-soft: "#6e5d50"
  ink-soft-dark: "#ab9a89"
  ink-faint: "#766658"
  ink-faint-dark: "#968573"
  rule: "rgba(60, 40, 25, 0.12)"
  rule-dark: "rgba(236, 226, 212, 0.1)"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 2.5rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.012em"
  lede:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body-strong:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.6
  year:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum, lnum"
  label:
    fontFamily: "Source Serif 4, Iowan Old Style, Charter, Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  none: "0px"
spacing:
  tight: "0.25rem"
  row: "0.85rem"
  column-gap: "1rem"
  heading-after: "1.25rem"
  lede: "1.5rem"
  section: "4.5rem"
  colophon: "6rem"
  year-column: "3.5rem"
  measure: "38rem"
  gutter: "clamp(1.25rem, 5vw, 2rem)"
  top: "clamp(4rem, 18vh, 10rem)"
components:
  link:
    textColor: "{colors.moss}"
  name:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  lede:
    textColor: "{colors.ink}"
    typography: "{typography.lede}"
  now-line:
    textColor: "{colors.ink-soft}"
    typography: "{typography.lede}"
  section-heading:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  work-year:
    textColor: "{colors.ink-soft}"
    typography: "{typography.year}"
    width: "{spacing.year-column}"
  work-name:
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
  work-name-link:
    textColor: "{colors.moss}"
    typography: "{typography.body-strong}"
  work-note:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  colophon:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
---

# Design System: Nikolai Onken

## Overview

**Creative North Star: "The Printer's Mark"**

The page is a title page. It is set in one serif on warm paper and signed with one small emblem, the way an old printer set a device beside the imprint. The type does all the work: the name, one line about the person, the current role, a dated list of work newest first, three links out, and a short colophon. Everything reads at once in a single left-aligned column, and nothing is hidden behind a click, a hover or an animation.

The only art is the mark: a hairline growth-ring emblem about the height of a capital, set just after the name. Its inner rings are fixed, slightly eccentric circles in faded ink. Its outer ring is the current year. A dotted ring shows the whole year and a moss arc runs from twelve o'clock as far round as the calendar has come. The favicon repeats the mark on a paper tile. The mark is a quiet signature, not an illustration, and it stays that small.

The density is low and the tone is calm and warm. Paper and brown ink carry every neutral; moss green is the one accent. An earlier version with a large illustrated tree cross-section was rejected by the owner as "too child like". Art stays at the scale of a mark beside the name.

**Key Characteristics:**
- One centred column, 38rem wide including its gutters, with left-aligned text and the name about 18vh from the top.
- One typeface (Source Serif 4, optical sizing on) at weights 400, 500 and 600, plus italic for the colophon note. No uppercase, no letter-spaced labels.
- Moss is the only accent. Every other colour is warm paper or brown ink, in a light and a dark theme that follow the system setting.
- Flat paper: no boxes, cards, shadows or images. The only line on the page is the colophon's hairline rule.
- The mark is the only art. It draws its year arc once on load and holds still.

## Colors

Warm unbleached paper, walnut ink in three strengths, and a single moss green, with a matched dark theme of charred-brown ground and parchment ink.

### Primary
- **Moss** (`moss`; `moss-dark` pale sage in dark mode): every link, the text selection background, the focus outline, and the current-year arc of the mark and favicon. It reaches 6.9:1 on paper and 9.9:1 on the dark ground.
- **Moss Underline** (`moss-soft` / `moss-soft-dark`, moss at 32% alpha): the resting underline under links. It turns to full moss on hover.

### Neutral
- **Unbleached Paper** (`ground`; `ground-dark` Charred Walnut): the page background, the selected-text colour, the favicon tile and the browser `theme-color`. Dark mode is a near-black brown, never a neutral grey.
- **Walnut Ink** (`ink`; `ink-dark` Parchment): the name, the lede, section headings, and project names that have no link.
- **Faded Ink** (`ink-soft`; `ink-soft-dark`): the current-role line, project notes, and the mark's fixed rings. 5.4:1 on paper, 6.7:1 on the dark ground.
- **Pencil Ink** (`ink-faint`; `ink-faint-dark`): non-text marks only, the mark's dotted year ring and the scrollbar thumb. Words use `ink-soft` or stronger; two nearly equal grey text levels blur the hierarchy.
- **Hairline** (`rule` / `rule-dark`): the single 1px rule above the colophon.

### Named Rules
**The One Green Rule.** Moss marks only what is live: a link, focus, selection, and the year still growing on the mark. Nothing decorative is green.

**The Brown-Not-Grey Rule.** Every neutral is a warm brown. The ground is paper or charred walnut, never grey, pure white or pure black.

**The Pair Rule.** Every colour token has a light and a dark value, switched by `prefers-color-scheme` on `:root`. A new colour ships as a pair or not at all.

## Typography

**Display Font:** Source Serif 4 (with Iowan Old Style, Charter, Georgia, serif)
**Body Font:** Source Serif 4 (the same family)

**Character:** A sturdy, open text serif with optical sizing, so the name tightens at display size and the list stays sturdy at reading size. It reads as a well-made book page, not a résumé template.

### Hierarchy
- **Display** (500, clamp(2rem, 5vw, 2.5rem), line-height 1.1, -0.012em): the name only, once per page, with the mark after it.
- **Lede** (400, 1.25rem, 1.5, balanced wrap): the one-line self-description. The current-role line below it uses the same size in faded ink.
- **Title** (600, 1.125rem): section headings ("Work", "Elsewhere"). They are body size; the weight alone makes them headings.
- **Body** (400, 1.125rem / 18px, 1.6, pretty wrap): project notes and running text. Project names use the same size at 500. The measure lands near 65 characters.
- **Year** (400, body size, tabular lining numerals): the work-list year column, so the years line up. Below 480px it drops to 0.9375rem and sits above its row, shown on every row.
- **Label** (400, 0.9375rem): the colophon. Its second line is italic.

### Named Rules
**The One Serif Rule.** Everything is Source Serif 4. Hierarchy comes from size, weight (400, 500, 600) and colour strength. Do not add a second face, a mono, uppercase or tracking.

**The Numbers Line Up Rule.** Any column of years or figures uses tabular lining numerals.

## Layout

A single centred column, `measure` (38rem) wide, with the `gutter` (clamp(1.25rem, 5vw, 2rem)) as side padding. The top padding is `top` (clamp(4rem, 18vh, 10rem)) and the bottom 4rem, so the name sits in the upper third of the first viewport and the work list starts above the fold.

The vertical rhythm: the lede sits `lede` (1.5rem) below the name and the role line `tight` (0.25rem) below that. Each section heading has `section` (4.5rem) above it and `heading-after` (1.25rem) below. Work rows are a two-column grid (`year-column` 3.5rem, then the text) with a `column-gap` (1rem) gap, stacked `row` (0.85rem) apart. When several projects share a year, the repeated year is hidden with `visibility: hidden`, so the column stays aligned and the year reads once. The Elsewhere links sit on one wrapping row (0.5rem by 1.75rem gaps). The colophon sits `colophon` (6rem) below, with `heading-after` of padding above its text.

**Responsive (one breakpoint, 480px):** each work row stacks, with the year on its own small line above the name and no gap between them. Repeated years show again, so no stacked row reads as undated. Everything else holds; the fluid gutter, top padding and display size carry the rest.

### Named Rules
**The One Column Rule.** Everything lives in the one 38rem column, left-aligned. No sidebars, no split heroes, no full-bleed bands.

## Elevation & Depth

None. The page is flat paper, with no shadows, cards, fills or layered surfaces. Structure comes only from space, type weight and colour strength, plus the one hairline over the colophon.

### Named Rules
**The Flat Paper Rule.** Nothing casts a shadow and nothing sits in a box. If something needs separating, use space first, then a single `rule` hairline.

## Shapes

Square and unboxed. Text has no containers, so there are no corners to round; the only radius on the page is the 1px softening on the focus outline. The one recurring geometry is the circle: the mark's rings, drawn as hairlines (0.6 to 1.3 units in a 40-unit box, under a pixel at display size) with round caps on the moss arc. The outbound arrow is a small two-stroke diagonal in the same hairline spirit, with round caps and joins. The favicon is the only rounded rectangle, because it is a tile, not page furniture.

### Named Rules
**The Hairline Rule.** Every drawn line is a hairline in ink or moss. Nothing drawn is filled, heavy or coloured beyond the palette.

## Components

### Links
Quiet, underlined, and always moss.
- **Style:** `moss` text with a 1px `moss-soft` underline, offset 0.22em.
- **Hover:** the underline turns solid moss over 160ms ease-out.
- **Focus:** a 1.5px solid moss outline, offset 3px, with a 1px radius.
- **Outbound:** work and Elsewhere links end in a small diagonal arrow (0.55em, 1.3 stroke, `aria-hidden`). It rests at 75% opacity (about 3:1 on paper); on hover or focus it goes to full strength and nudges up and right by 0.08em (200ms, cubic-bezier(0.16, 1, 0.3, 1)). The inline role link in the intro carries no arrow.

### Name and Mark (signature)
The name in Display, followed by the growth-ring mark at 1.05em square with a 0.9rem gap, both vertically centred on one line.
- **Fixed rings:** five circles (radii 4, 7.5, 10.5, 13 and 15.5 in a 40-unit box) in `ink-soft` at 0.7 units, each centre nudged slightly up and right so the rings read as grown, not compassed.
- **Year ring:** the full outer circle (radius 18.5) as a dotted `ink-faint` hairline, and over it a 1.3-unit `moss` arc with round caps, running clockwise from twelve o'clock to the fraction of the year elapsed. The arc is computed on the client only; the server render shows the dotted ring alone.
- **Motion:** on load the arc draws on over 1400ms (cubic-bezier(0.16, 1, 0.3, 1), 200ms delay). Under reduced motion it appears finished. It never loops.
- **Accessibility:** the mark is `aria-hidden`; the colophon states in words how far the year has grown.

### Favicon
The mark reduced for a 32px tile: a paper square (7-unit radius), three `ink-soft` rings and a 2-unit moss arc from twelve o'clock. The arc is fixed in the file, not live.

### Work List
A dated list, newest first, the way rings read from the outside in.
- **Structure:** the year in the tabular `ink-soft` column, then the project name (500; a moss link when it has a URL, otherwise ink) and an optional `ink-soft` note on the same line.
- **No chrome:** no dividers, fills, radius or hover states beyond the link itself.

### Section Heading
Body size at 600 in ink. No rule, number, eyebrow or icon.

### Elsewhere Row
Plain outbound links on one wrapping row, with the arrow, and nothing else.

### Colophon
A 1px `rule` above, then two `ink-soft` lines at label size: the copyright, and an italic note on the mark.

## Do's and Don'ts

### Do:
- **Do** set every word in Source Serif 4 and build hierarchy from size, weight (400/500/600) and the three ink strengths.
- **Do** keep moss for links, focus, selection and the growing year only (The One Green Rule).
- **Do** keep all content in the single 38rem column with the fluid gutter.
- **Do** give every new colour a light and a dark value, both warm.
- **Do** keep text at `ink-soft` strength or stronger; `ink-faint` is for hairline marks only.
- **Do** use tabular lining numerals for any column of years or figures.

### Don't:
- **Don't** add illustration: no tree cross-section, pins, core lines, bark or wood textures. The illustrated version was rejected as "too child like".
- **Don't** grow the mark past about 1em beside the name, or repeat it as decoration elsewhere on the page.
- **Don't** add boxes, cards, shadows, background fills or images.
- **Don't** add a second typeface, uppercase labels, eyebrows or letter-spacing.
- **Don't** use grey, pure white or pure black anywhere.
- **Don't** gate or delay any text behind motion, hover or discovery.
