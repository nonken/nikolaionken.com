import { Source_Serif_4 } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-text",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const description =
  "Coder, builder, musician. Lover of nature, humans, and the universe. CEO at Unknown Inc.";

export const metadata = {
  title: {
    default: "Nikolai Onken",
    template: "%s · Nikolai Onken",
  },
  description,
  metadataBase: new URL("https://nikolaionken.com"),
  openGraph: {
    title: "Nikolai Onken",
    description,
    url: "https://nikolaionken.com",
    siteName: "Nikolai Onken",
    type: "website",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4eee4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1511" },
  ],
};

const CONTRACT = `
THESIS: A type-first personal page, warm and quiet; the only art is a small growth-ring mark whose outer ring fills as the year passes. Refuses the illustrated hero.
OWN-WORLD: Warm paper ground, walnut ink, moss links; Source Serif 4 throughout; hairline ring mark; no boxes, no imagery.
STORY: Visitor reads name, line, current role, and dated work in one column, follows a link out.
FIRST VIEWPORT: Single left-aligned 38rem column, name with ring mark at ~18vh from top, lede, current role, start of the work list.
FORM: Growth Rings, distilled to a mark after owner feedback ("too child like"); seed 3a8b64a4.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        {children}
      </body>
    </html>
  );
}
