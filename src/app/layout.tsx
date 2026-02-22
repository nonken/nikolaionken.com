import type { Metadata } from "next";
import { PT_Serif, PT_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "nikolaionken.com",
    template: "%s | nikolaionken.com",
  },
  description: "Entrepreneur",
  metadataBase: new URL("https://nikolaionken.com"),
  openGraph: {
    title: "nikolaionken.com",
    description: "Entrepreneur",
    url: "https://nikolaionken.com",
    siteName: "nikolaionken.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ptSerif.variable} ${ptSans.variable}`}>
        <header className="navigation-wrapper">
          <div className="site-name">
            <Link href="/">nikolaionken.com</Link>
          </div>
          <nav className="top-navigation">
            <ul>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/articles">Articles</Link>
              </li>
            </ul>
          </nav>
        </header>

        <main id="main" role="main">
          {children}
        </main>

        <footer className="footer-wrap">
          <h6>&copy; {new Date().getFullYear()} Nikolai Onken.</h6>
        </footer>
      </body>
    </html>
  );
}
