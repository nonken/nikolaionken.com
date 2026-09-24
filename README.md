# nikolaionken.com

Personal website for Nikolai Onken — coder, builder, musician.

A single, type-first page: name, a short line, and a dated list of work. The only art is a small growth-ring mark beside the name whose outer ring fills in as the year passes.

## Stack

- Next.js 16 (App Router), React 19, plain CSS
- Source Serif 4 via `next/font`

## Where things live

```
src/app/
├── content.js   # all copy: profile, work, links
├── Home.jsx     # the page (client component)
├── globals.css  # tokens, layout, light/dark
└── layout.jsx   # fonts and metadata
```

To add a project, add an entry to `WORK` in `content.js`.

## Development

```bash
npm install
npm run dev
```
