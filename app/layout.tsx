import type { Metadata } from "next";
import { Permanent_Marker, Caveat, Inter } from "next/font/google";
import "./globals.css";

const brush = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-brush",
});

const hand = Caveat({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-hand",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "WOMAN THAT LEADS",
  description: "A gathering for women building, deciding and leading.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${brush.variable} ${hand.variable} ${body.variable} font-body antialiased`}>
        <div className="grain-overlay" />
        <div className="vignette" />
        {children}
      </body>
    </html>
  );
}
