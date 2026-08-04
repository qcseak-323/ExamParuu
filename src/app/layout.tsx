import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PreferencesEffect from "@/components/PreferencesEffect";
import AuthProvider from "@/components/AuthProvider";
import ProgressSync from "@/components/ProgressSync";
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
      {/* Deliberately a raw <script> in <head>, not next/script. It has to run
          synchronously during HTML parsing to set the theme before first paint;
          `strategy="beforeInteractive"` defers it into Next's __next_s queue,
          which only runs once the client bundle loads — i.e. after paint, which
          reintroduces a flash of the wrong palette on every page load.
          React 19 logs a dev-only warning about this; it is stripped in
          production builds and does not affect users. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <PreferencesEffect />
          <ProgressSync />
          <Nav />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
