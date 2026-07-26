import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { SaasProvider } from "@/lib/saas";
import { ThemeProvider } from "@/src/design/theme/ThemeProvider";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EquityOS — Pro Trading Terminal",
  description:
    "Premium equity research and portfolio management platform for Indian markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <SaasProvider>
            <AppShell>{children}</AppShell>
          </SaasProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
