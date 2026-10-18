"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Se specificato, solo quel ruolo può accedere */
  requiredRole?: UserRole;
}

/**
 * Wrapper che reindirizza a /login se l'utente non è autenticato.
 * Se requiredRole è "admin" e l'utente è "dipendente", reindirizza a /.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && role !== requiredRole) {
      router.replace("/");
    }
  }, [user, role, loading, requiredRole, router]);

  // Schermata di caricamento auth
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--bg-app)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Non autenticato: non renderizzare nulla (il redirect è in corso)
  if (!user) return null;
  if (requiredRole && role !== requiredRole) return null;

  return <>{children}</>;
}
