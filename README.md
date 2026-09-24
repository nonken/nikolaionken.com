# nikolaionken.com

Personal website for Nikolai Onken — coder, builder, musician.

A single page: a generated tree cross-section with one growth ring per year since 2008 (the outer ring fills in as the current year passes), beside a dated list of work. Hovering a project highlights the ring it grew in.

## Stack

- Next.js 16 (App Router), React 19, plain CSS
- Alegreya Sans via `next/font`

## Where things live

```
src/app/
├── content.js   # all copy: profile, work, links
├── rings.js     # pure, seeded geometry for the cross-section
├── Home.jsx     # the page (client component: slice + text)
├── globals.css  # tokens, layout, slice styling, light/dark
└── layout.jsx   # fonts and metadata
```

To add a project, add an entry to `WORK` in `content.js`; it gets a pin in its year's ring automatically.

## Development

```bash
npm install
npm run dev
```
