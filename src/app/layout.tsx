import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ChildTrustFund.gov — U.S. Child Trust Fund Administration",
    template: "%s | U.S. Child Trust Fund",
  },
  description:
    "Official site of the United States Child Trust Fund. Register a child, verify your identity, and receive the federal seed deposit into the child's trust account. Automatic enrollment for children born 2025–2028.",
  keywords: [
    "Child Trust Fund",
    "CTF",
    "baby bond",
    "children savings account",
    "U.S. Department of the Treasury",
    "state match",
    "register child account",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col bg-white text-gov-ink antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
