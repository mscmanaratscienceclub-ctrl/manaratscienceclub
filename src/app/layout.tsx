import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import Providers from "@/providers";
import { Cormorant_Garamond, DM_Sans, Fredoka, Rubik, Unbounded } from "next/font/google";
import { cn } from "@/lib/utils";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["400", "500", "600", "700"],
});
const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  weight: ["400", "500", "600", "700"],
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://manaratscience.club"),
  title: {
    default: "Manarat Science Club",
    template: "%s | Manarat Science Club",
  },
  description:
    "A prestigious high school science club where curiosity meets creativity — featuring robotics, astronomy, chemistry, biology, and student research.",
  icons: {
    icon: [{ url: "/msc.svg", type: "image/svg+xml" }],
    shortcut: "/msc.svg",
    apple: "/msc.svg",
  },
  openGraph: {
    title: "Manarat Science Club",
    description:
      "A prestigious high school science club where curiosity meets creativity — featuring robotics, astronomy, chemistry, biology, and student research.",
    url: "https://manaratscience.club",
    siteName: "Manarat Science Club",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 1024,
        alt: "Manarat Science Club — where curiosity meets creativity",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Manarat Science Club",
    description:
      "A prestigious high school science club where curiosity meets creativity — featuring robotics, astronomy, chemistry, biology, and student research.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans",
        fredoka.variable,
        rubik.variable,
        cormorant.variable,
        dmSans.variable,
        unbounded.variable,
      )}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Pre-paint motion gate: tags <html class="motion-ok"> before the
            hero paints, ONLY when a JS runtime exists and the user allows
            motion. globals.css uses this class to pre-hide GSAP-animated
            hero elements, so the server HTML never flashes the final state
            during the hydration window. No JS / reduced motion => no class
            => fully visible static layout. Must stay the FIRST element in
            <body> so it executes before the hero HTML is parsed. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (!matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("motion-ok");`,
          }}
        />
        <Providers>{children}</Providers>
        <SpeedInsights />
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-XH5R8YBGX6"}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-XH5R8YBGX6"}');
          `}
        </Script>
      </body>
    </html>
  );
}
