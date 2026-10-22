"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { onAuthChange, getUserProfile, touchLastLogin } from "@/lib/authService";
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
        // Tieni "loading" attivo finché il profilo non è caricato, così la UI non mostra mai un ruolo provvisorio
        if (firebaseUser) setLoading(true);
        if (firebaseUser) {
          try {
            let userProfile: UserProfile | null = null;
            let lastErr: unknown = null;
            // Il token auth può non essere ancora propagato a Firestore: riprova prima di arrendersi
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                userProfile = await getUserProfile(firebaseUser.uid);
                lastErr = null;
                break;
              } catch (e) {
                lastErr = e;
                await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
              }
            }
            if (lastErr) throw lastErr;

            // Nessun profilo valido = account non abilitato (i profili li crea solo l'admin)
            if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "dipendente")) {
              userProfile = null;
            }
            setProfile(userProfile);
            setUser(firebaseUser);
            if (userProfile) touchLastLogin(firebaseUser.uid);
          } catch (profileErr) {
            // Non assegnare mai un ruolo fittizio: un admin verrebbe degradato a dipendente
            console.error("Errore lettura profilo utente:", profileErr);
            setProfile(null);
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
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
