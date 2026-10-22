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

            if (!userProfile || !userProfile.role) {
              // Profilo non presente su Firestore: crealo con ruolo dipendente (principio del minimo privilegio)
              const defaultRole: UserRole = "dipendente";
              const displayName =
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "Utente";

              await createUserProfile(
                firebaseUser.uid,
                firebaseUser.email || "",
                displayName,
                defaultRole
              );

              userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName,
                role: defaultRole,
              };
            }
            setProfile(userProfile);
          } catch (profileErr) {
            console.warn("Profilo utente non trovato o errore lettura:", profileErr);
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "Utente",
              role: "dipendente",
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
