"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationToast } from "@/components/NotificationToast";
import type { UserRole } from "@/types";

// Rotte pubbliche: nessuna autenticazione richiesta
const PUBLIC_ROUTES = ["/login"];

// Rotte riservate solo agli admin
const ADMIN_ONLY_PREFIXES = ["/notifiche", "/pagamenti", "/utenti"];

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + "/"));

  if (isPublic) {
    return <>{children}</>;
  }

  const isAdminOnly = ADMIN_ONLY_PREFIXES.some(
    (r) => pathname === r || pathname?.startsWith(r + "/")
  );
  const requiredRole: UserRole | undefined = isAdminOnly ? "admin" : undefined;

  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <div className="layout-wrapper">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <NotificationToast />
      </div>
    </ProtectedRoute>
  );
}
