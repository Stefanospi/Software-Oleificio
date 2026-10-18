"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Rotte pubbliche che non richiedono autenticazione e non mostrano la sidebar
const PUBLIC_ROUTES = ["/login"];

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/login" || pathname?.startsWith("/login");

  if (isPublic) {
    // Pagine pubbliche: solo il contenuto, senza sidebar
    return <>{children}</>;
  }

  // Pagine protette: sidebar + guard auth
  return (
    <ProtectedRoute>
      <div
        className="layout-wrapper"
        style={{ display: "flex", height: "100%", width: "100%" }}
      >
        <Sidebar />
        <main
          className="main-content"
          style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
