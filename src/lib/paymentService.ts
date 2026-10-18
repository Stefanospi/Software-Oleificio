import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Payment, PaymentStatus, PaymentMethod } from "../types";

const COL = "payments";

// ─── LETTURA ───────────────────────────────────────────────────────────────────
export const getPaymentsByCustomer = async (customerId: string): Promise<Payment[]> => {
  const q = query(
    collection(db, COL),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
};

export const getPaymentByBatch = async (batchId: string): Promise<Payment | null> => {
  const q = query(collection(db, COL), where("batchId", "==", batchId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Payment;
};

export const getAllPayments = async (): Promise<Payment[]> => {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
};

export const getUnpaidPayments = async (): Promise<Payment[]> => {
  const q = query(
    collection(db, COL),
    where("status", "in", ["unpaid", "partial"]),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
};

// ─── CREAZIONE ─────────────────────────────────────────────────────────────────
export const addPayment = async (
  payment: Omit<Payment, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, COL), {
    ...payment,
    status: payment.status ?? "unpaid",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── AGGIORNAMENTO STATO ───────────────────────────────────────────────────────
export const setPaymentPartial = async (
  id: string,
  partialAmount: number,
  method?: PaymentMethod
) => {
  await updateDoc(doc(db, COL, id), {
    status: "partial" satisfies PaymentStatus,
    partialAmount,
    partialDate: serverTimestamp(),
    ...(method ? { paymentMethod: method } : {}),
    updatedAt: serverTimestamp(),
  });
};

export const setPaymentPaid = async (
  id: string,
  paidAmount: number,
  method?: PaymentMethod
) => {
  await updateDoc(doc(db, COL, id), {
    status: "paid" satisfies PaymentStatus,
    paidAmount,
    paidDate: serverTimestamp(),
    ...(method ? { paymentMethod: method } : {}),
    updatedAt: serverTimestamp(),
  });
};

export const updatePaymentNotes = async (id: string, adminNotes: string) => {
  await updateDoc(doc(db, COL, id), {
    adminNotes,
    updatedAt: serverTimestamp(),
  });
};

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── ELIMINAZIONE ─────────────────────────────────────────────────────────────
export const deletePayment = async (id: string) => {
  await deleteDoc(doc(db, COL, id));
};
