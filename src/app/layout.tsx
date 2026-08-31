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
  title: "ArchForge — Provider-neutral architecture design",
  applicationName: "ArchForge",
  description:
    "Design, validate, and export provider-neutral system architectures with explicit evidence and observable WebMCP assistance.",
  keywords: [
    "software architecture",
    "system design",
    "provider-neutral",
    "WebMCP",
    "local-first",
  ],
  category: "technology",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skipLink" href="#main-content">
          Skip to architecture workspace
        </a>
        {children}
      </body>
    </html>
  );
}
