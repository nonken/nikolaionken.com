import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: {
    default: "nikolaionken.com",
    template: "%s | nikolaionken.com",
  },
  description:
    "Coder, builder, musician. Lover of nature, humans, and the universe. CTO at Asymmetric.",
  metadataBase: new URL("https://nikolaionken.com"),
  openGraph: {
    title: "nikolaionken.com",
    description:
      "Coder, builder, musician. Lover of nature, humans, and the universe. CTO at Asymmetric.",
    url: "https://nikolaionken.com",
    siteName: "nikolaionken.com",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${plexMono.variable} ${spaceGrotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
