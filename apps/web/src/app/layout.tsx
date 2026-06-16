import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Freelancer OS",
  description: "Your AI-powered freelance operating system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-white font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}
