import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as signInSecondary,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, secondaryAuth } from "./firebase";
import type { UserProfile, UserRole } from "../types";

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
export const loginWithEmail = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Aggiorna lastLogin in modo sicuro (merge evita errori se il doc non esiste ancora)
  try {
    await setDoc(
      doc(db, "users", credential.user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn("Impossibile aggiornare lastLogin su Firestore:", err);
  }
  return credential.user;
};

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
export const logout = async () => {
  await signOut(auth);
};

// ─── PROFILO UTENTE ────────────────────────────────────────────────────────────
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};

// ─── CREA PROFILO (usato da admin per aggiungere dipendenti) ───────────────────
export const createUserProfile = async (
  uid: string,
  email: string,
  displayName: string,
  role: UserRole
) => {
  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      email,
      displayName,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    } satisfies Omit<UserProfile, "createdAt" | "lastLogin"> & Record<string, unknown>,
    { merge: true }
  );
};

// ─── CREA ACCOUNT AUTH (seconda istanza, non slogga l'admin) ──────────────────
export const createAccountWithSecondaryAuth = async (
  email: string,
  password: string
): Promise<string> => {
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  // Fai subito logout dalla sessione secondaria: non serve tenerla aperta
  await signOut(secondaryAuth);
  return credential.user.uid;
};

// ─── ELIMINA PROFILO UTENTE ───────────────────────────────────────────────────
export const deleteUserProfile = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, "users", uid));
};

// ─── AGGIORNA RUOLO ────────────────────────────────────────────────────────────
export const updateUserRole = async (uid: string, role: UserRole) => {
  await updateDoc(doc(db, "users", uid), { role });
};

// ─── OBSERVER AUTH STATE ───────────────────────────────────────────────────────
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
