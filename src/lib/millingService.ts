import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Milling, MillingStatus } from "../types";

const COL = "millings";

// ─── LETTURA ───────────────────────────────────────────────────────────────────
export const getMillingForBatch = async (batchId: string): Promise<Milling | null> => {
  const q = query(collection(db, COL), where("batchId", "==", batchId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Milling;
};

export const getMillingsByCustomer = async (
  customerId: string,
  batchIds: string[]
): Promise<Milling[]> => {
  if (!batchIds.length) return [];
  // Firestore "in" supporta max 30 elementi; chunking se necessario
  const chunks: string[][] = [];
  for (let i = 0; i < batchIds.length; i += 30) {
    chunks.push(batchIds.slice(i, i + 30));
  }
  const results: Milling[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, COL), where("batchId", "in", chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as Milling));
  }
  return results;
};

export const getAllMillings = async (): Promise<Milling[]> => {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Milling));
};

// ─── CREAZIONE ─────────────────────────────────────────────────────────────────
export const addMilling = async (
  milling: Omit<Milling, "id" | "createdAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, COL), {
    ...milling,
    status: milling.status ?? "pending",
    createdAt: serverTimestamp(),
  });

  // Aggiorna contatori denormalizzati nel documento cliente
  // (supponendo di avere customerId passato dalla chiamante via batchId → customerId)
  return docRef.id;
};

// ─── AGGIORNAMENTO STATO ───────────────────────────────────────────────────────
export const updateMillingStatus = async (
  id: string,
  status: MillingStatus
) => {
  const updates: Record<string, unknown> = { status };
  if (status === "completed") {
    updates.completedAt = serverTimestamp();
  }
  await updateDoc(doc(db, COL, id), updates);
};

export const updateMilling = async (id: string, data: Partial<Milling>) => {
  await updateDoc(doc(db, COL, id), data);
};

// ─── RIEPILOGO PER CLIENTE ────────────────────────────────────────────────────
export interface MillingSummary {
  totalMillings: number;
  totalOlivesKg: number;
  totalOilLiters: number;
  avgYieldPercent: number;
  millings: Milling[];
}

export const getMillingSummaryForCustomer = async (
  batchIds: string[]
): Promise<MillingSummary> => {
  const millings = await getMillingsByCustomer("", batchIds);

  const totalMillings = millings.length;
  const totalOlivesKg = millings.reduce((s, m) => s + m.totalOlivesWeightKg, 0);
  const totalOilLiters = millings.reduce((s, m) => s + m.producedOilLiters, 0);
  const avgYieldPercent =
    totalMillings > 0
      ? millings.reduce((s, m) => s + m.yieldPercentage, 0) / totalMillings
      : 0;

  return {
    totalMillings,
    totalOlivesKg,
    totalOilLiters,
    avgYieldPercent: parseFloat(avgYieldPercent.toFixed(2)),
    millings,
  };
};
