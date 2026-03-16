import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";

const ScrollProgress = dynamic(() => import("@/components/ScrollProgress"));
const BackToTop = dynamic(() => import("@/components/BackToTop"));
const ChatBot = dynamic(() => import("@/components/ChatBot"));

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Ajay Kumar | ML Engineer",
    template: "%s | Ajay Kumar",
  },
  description:
    "Portfolio of Ajay Kumar — ML Engineer with 7+ years building AI platforms for Microsoft. Multi-agent orchestration, NL-to-SQL, causal inference, and more.",
  keywords: [
    "Ajay Kumar",
    "ML Engineer",
    "GenAI",
    "Azure",
    "Portfolio",
    "Machine Learning",
  ],
  openGraph: {
    title: "Ajay Kumar | ML Engineer",
    description:
      "ML Engineer with 7+ years building AI platforms for Microsoft.",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-gray-900 dark:bg-navy-900 dark:text-gray-100 transition-colors duration-300`}
      >
        <Providers>
          <ScrollProgress />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <BackToTop />
          <ChatBot />
        </Providers>
      </body>
    </html>
  );
}
