import type { Metadata } from "next";
import { Playfair_Display, Bitter, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/app/components/providers";
import { AuthSync } from "@/app/components/auth-sync";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bitter = Bitter({
  variable: "--font-paragraph",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nudge - AI Sales Outreach Platform",
  description: "Automate personalized sales outreach with AI-powered email campaigns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${playfair.variable} ${bitter.variable} ${inter.variable} antialiased`}
        >
          <Providers>
            <AuthSync />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
