# nikolaionken.com

Personal website and blog for Nikolai Onken — coder, builder, musician.

Built with [Next.js](https://nextjs.org) and deployed on [Vercel](https://vercel.com).

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Rendering:** React 19 with `react-markdown` for blog content
- **Fonts:** PT Serif (headings) + PT Sans (body) via Google Fonts
- **Deployment:** Vercel

## Project Structure

```
src/
├── app/
│   ├── page.tsx            # Homepage
│   ├── about/page.tsx      # About page
│   ├── articles/
│   │   ├── page.tsx        # Articles listing
│   │   └── [slug]/page.tsx # Individual article pages
│   ├── layout.tsx          # Root layout with nav and footer
│   └── globals.css         # Global styles
└── lib/
    └── posts.ts            # Post data and utilities
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site locally.

## Building

```bash
npm run build
npm start
```
