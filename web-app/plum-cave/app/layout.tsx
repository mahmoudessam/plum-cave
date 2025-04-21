import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plum Cave",
  description: "A secure cloud backup solution enhanced with advanced, client-side cryptography, leveraging zero-knowledge principles for ultimate data privacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.webp" type="image/webp" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--background)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
