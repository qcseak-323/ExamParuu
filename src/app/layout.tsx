import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PreferencesEffect from "@/components/PreferencesEffect";
import { PREFERENCES_INIT_SCRIPT } from "@/lib/preferencesScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamReady — Microsoft Certification Practice",
  description:
    "Free, retro-styled practice questions, study guides, and flashcards to help you pass Microsoft certification exams — starting with DP-600 and AB-900.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PreferencesEffect />
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
