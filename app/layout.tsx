import type { Metadata } from "next";
import { Fraunces, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Osiris Social Calendar",
  description: "Drive linklerinden ve bir promptdan akışkan, paylaşılabilir bir sosyal medya takvimi üretir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${figtree.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <div id="toast-root" />
      </body>
    </html>
  );
}
