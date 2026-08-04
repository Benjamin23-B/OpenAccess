import type { Metadata, Viewport } from "next";
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
  title: "Niral Thiruvizha - Accessibility Platform",
  description: "Empowering communication through technology. Speech-to-text, text-to-speech, and accessibility tools for everyone.",
  keywords: ["accessibility", "speech recognition", "text to speech", "assistive technology", "visually impaired", "deaf", "mute"],
  authors: [{ name: "Niral Thiruvizha Team" }],
  openGraph: {
    title: "Niral Thiruvizha - Accessibility Platform",
    description: "Empowering communication through technology",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F4C81",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A]`}
      dir="ltr"
    >
      <body className="min-h-screen bg-[#F5F7FA] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] antialiased transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
