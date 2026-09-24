import { Alegreya_Sans } from "next/font/google";
import "./globals.css";

const alegreya = Alegreya_Sans({
  variable: "--font-text",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
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
    { media: "(prefers-color-scheme: light)", color: "#efe4d2" },
    { media: "(prefers-color-scheme: dark)", color: "#1d140e" },
  ],
};

const CONTRACT = `
THESIS: A builder's eighteen years drawn as a tree's growth rings, with the work set beside them as plain text. Refuses the full-screen gimmick and the bare résumé page.
OWN-WORLD: Warm light ground, end-grain wood slice in heartwood-to-sapwood copper and walnut, bark rim, graphite pencil core line with year ticks, moss-green pins and links; one humanist sans, one text size family.
STORY: Visitor sees the person and the whole arc at once, reads name, line, and dated work, follows a link out.
FIRST VIEWPORT: Desktop: slice left at ~80vh (column-limited at 1440px), sticky; name, lede, current role, and start of the dated work list right. Mobile: slice on top, text below.
FORM: Growth Rings, candidate 1 of 7 (impeccable's pick, chosen by the owner); seed 3a8b64a4.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={alegreya.variable}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        {children}
      </body>
    </html>
  );
}
