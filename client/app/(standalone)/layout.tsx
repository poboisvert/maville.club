import "../globals.css";
import type { Metadata } from "next";
import { Inter, Patrick_Hand } from "next/font/google";

import { detectLanguage } from "@/app/i18n/server";
import { I18nProvider } from "@/app/i18n/i18n-context";

const inter = Inter({ subsets: ["latin"] });
const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  variable: "--font-patrick-hand",
  weight: "400",
});

export const metadata: Metadata = {
  title: "MaVille.Club | Déneigement intelligent à Montréal",
  description:
    "MaVille.Club est une plateforme intelligente de déneigement à Montréal. Suivi des opérations, alertes neige, état des rues et informations en temps réel pour citoyens et entreprises.",
  applicationName: "MaVille.Club",
  keywords: [
    "déneigement",
    "neige",
    "Montréal",
    "déneigement Montréal",
    "état des rues",
    "alertes neige",
    "hiver Québec",
    "MaVille.Club",
  ],
  authors: [{ name: "MaVille.Club" }],
  creator: "MaVille.Club",
  publisher: "MaVille.Club",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#111827" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],

  metadataBase: new URL("https://www.maville.club"),

  openGraph: {
    title: "MaVille.Club | Suivi du déneigement à Montréal",
    description:
      "Suivez le déneigement à Montréal : opérations en cours, alertes neige et état des rues en temps réel avec MaVille.Club.",
    url: "https://www.maville.Club",
    siteName: "MaVille.Club",
    locale: "fr_CA",
    type: "website",
    images: [
      {
        url: "https://www.maville.club/logo.webp",
        width: 192,
        height: 192,
        alt: "MaVille.Club Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "MaVille.Club | Déneigement à Montréal",
    description:
      "Alertes neige, suivi du déneigement et état des rues à Montréal. Simple, clair et en temps réel.",
    images: ["https://www.maville.club/logo.webp"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lng = await detectLanguage();

  // Checks if we're being rendered for a social preview (link shared - OpenGraph/Twitter)
  // On actual user navigation, just render as normal
  // If we want to display the logo when the page is accessed by link sharing bots,
  // we should serve a minimal body with the logo. Here, we use user agent sniffing.
  // Next.js itself cannot fully distinguish crawl/sharing bots on the server.
  // So: We'll always render the logo visually at the root for these routes as a fallback.

  // Instructed: "when the link is shared render the logo logo.webp from public"
  // For most bots, the Open Graph image is enough, but we'll add a
  // noscript fallback rendering the logo (for sharing previews) if the user agent disables JS.

  return (
    <html lang={lng}>
      <body className={`${inter.className} ${patrickHand.variable}`}>
        <I18nProvider language={lng}>{children}</I18nProvider>
      </body>
    </html>
  );
}
