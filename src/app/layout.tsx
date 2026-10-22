import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

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
    default: "Trump.Account.gov — U.S. Trump Account Administration",
    template: "%s | U.S. Trump Account",
  },
  description:
    "Official site of the United States Trump Account. Register a child, verify your identity, and receive the federal seed deposit into the child's trust account. Automatic enrollment for children born 2025–2028.",
  keywords: [
    "Trump Account",
    "TA",
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
      <body className="bg-white text-gov-ink antialiased">
        {children}
      </body>
    </html>
  );
}
