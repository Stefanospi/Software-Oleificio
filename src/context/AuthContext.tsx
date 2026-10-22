"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { onAuthChange, getUserProfile, createUserProfile } from "@/lib/authService";
import type { UserProfile, UserRole } from "@/types";

// ─── TIPO CONTEXT ──────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  isAdmin: false,
});

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          try {
            let userProfile = await getUserProfile(firebaseUser.uid);
            // Se l'utente non ha ancora un documento profilo o il campo role non è impostato:
            // L'amministratore principale (sspitaleri26@gmail.com) riceve "admin", tutti gli altri ricevono "dipendente"
            const isMasterAdmin = firebaseUser.email?.toLowerCase() === "sspitaleri26@gmail.com";
            const fallbackRole: UserRole = isMasterAdmin ? "admin" : "dipendente";

            if (!userProfile || !userProfile.role) {
              const defaultRole: UserRole = fallbackRole;
              await createUserProfile(
                firebaseUser.uid,
                firebaseUser.email || "",
                firebaseUser.displayName || firebaseUser.email?.split("@")[0] || (isMasterAdmin ? "Amministratore" : "Dipendente"),
                defaultRole
              );
              userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || (isMasterAdmin ? "Amministratore" : "Dipendente"),
                role: defaultRole,
              };
            }
            setProfile(userProfile);
          } catch (profileErr) {
            console.warn("Profilo utente non trovato o errore lettura, imposto profilo di fallback:", profileErr);
            const isMasterAdmin = firebaseUser.email?.toLowerCase() === "sspitaleri26@gmail.com";
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || (isMasterAdmin ? "Amministratore" : "Dipendente"),
              role: isMasterAdmin ? "admin" : "dipendente",
            });
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Errore auth:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const role = profile?.role ?? null;
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
