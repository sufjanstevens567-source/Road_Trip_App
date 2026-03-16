import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Road Trip Operating System",
  description: "Interactive planning dashboard for a 9-day Luxembourg to Sofia European road trip.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

