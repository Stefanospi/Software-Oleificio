import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Oleificio Pro – Gestione Oleificio",
  description:
    "Software professionale per la gestione di un oleificio: clienti, bins, partite, contenitori olio.",
};

// Patch per evitare NotFoundError su touch device / Next.js devtools
if (typeof window !== "undefined" && typeof Element !== "undefined" && Element.prototype.releasePointerCapture) {
  const origReleasePointerCapture = Element.prototype.releasePointerCapture;
  Element.prototype.releasePointerCapture = function (pointerId: number) {
    try {
      if (this.hasPointerCapture && this.hasPointerCapture(pointerId)) {
        origReleasePointerCapture.call(this, pointerId);
      }
    } catch (_) {
      // Ignora l'eccezione nativa se l'elemento è già stato rilasciato
    }
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={inter.className}
        style={{ minHeight: "100dvh", backgroundColor: "var(--bg-app)" }}
      >
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
