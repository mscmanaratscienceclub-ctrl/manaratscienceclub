import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import Providers from "@/providers";
import { Fredoka, Rubik } from "next/font/google";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://manaratscience.club"),
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
        url: "/msc.svg",
        width: 1200,
        height: 630,
        alt: "Manarat Science Club",
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
    images: ["/msc.svg"],
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
      className={cn(
        "font-sans",
        fredoka.variable,
        rubik.variable,
      )}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-XH5R8YBGX6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XH5R8YBGX6');
          `}
        </Script>
      </body>
    </html>
  );
}
