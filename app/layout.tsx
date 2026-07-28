import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { SaasProvider } from "@/lib/saas";
import { BillingProvider } from "@/lib/billing";
import { OpsProvider } from "@/lib/ops";
import { ThemeProvider } from "@/src/design/theme/ThemeProvider";
import "@/styles/globals.css";

/** Sprint 10C — Inter Variable only (weights 400–700 via CSS). */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <SaasProvider>
            <BillingProvider>
              <OpsProvider>
                <AppShell>{children}</AppShell>
              </OpsProvider>
            </BillingProvider>
          </SaasProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
