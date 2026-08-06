import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Галя — AI-ассистент для записи клиентов",
  description: "Telegram-бот, который отвечает клиентам и записывает их 24/7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
