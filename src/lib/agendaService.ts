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
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Appointment, AppointmentType, AppointmentStatus } from "../types";

const COL = "appointments";

// ─── LETTURA ───────────────────────────────────────────────────────────────────
export const getAllAppointments = async (): Promise<Appointment[]> => {
  const q = query(collection(db, COL), orderBy("startDate", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
};

export const getAppointmentsByDateRange = async (
  start: Date,
  end: Date
): Promise<Appointment[]> => {
  const q = query(
    collection(db, COL),
    where("startDate", ">=", Timestamp.fromDate(start)),
    where("startDate", "<=", Timestamp.fromDate(end)),
    orderBy("startDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
};

export const getAppointmentsByCustomer = async (
  customerId: string
): Promise<Appointment[]> => {
  const q = query(
    collection(db, COL),
    where("customerId", "==", customerId),
    orderBy("startDate", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
};

// Appuntamenti del giorno specificato
export const getAppointmentsForDay = async (date: Date): Promise<Appointment[]> => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return getAppointmentsByDateRange(start, end);
};

// ─── CREAZIONE ─────────────────────────────────────────────────────────────────
export const addAppointment = async (
  appointment: Omit<Appointment, "id" | "createdAt">
): Promise<string> => {
  const docRef = await addDoc(collection(db, COL), {
    ...appointment,
    status: appointment.status ?? "scheduled",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── AGGIORNAMENTO ─────────────────────────────────────────────────────────────
export const updateAppointment = async (
  id: string,
  data: Partial<Appointment>
) => {
  await updateDoc(doc(db, COL, id), data);
};

export const updateAppointmentStatus = async (
  id: string,
  status: AppointmentStatus
) => {
  await updateDoc(doc(db, COL, id), { status });
};

// ─── ELIMINAZIONE ─────────────────────────────────────────────────────────────
export const deleteAppointment = async (id: string) => {
  await deleteDoc(doc(db, COL, id));
};
