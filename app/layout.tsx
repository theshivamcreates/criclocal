import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CricLocal",
  description: "Live cricket scoring, public scoreboard, and stream overlay."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
