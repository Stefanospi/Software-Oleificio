import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from "firebase/firestore";
import type { Customer, Bin, Batch, Weighing, Milling, Container } from "../types";

// Helper: rimuove qualsiasi campo con valore undefined che manderebbe in errore Firestore SDK
const sanitizeData = <T extends Record<string, unknown>>(data: T): Partial<T> => {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as Partial<T>;
};

// --- CUSTOMERS ---
export const getCustomers = async () => {
  const snapshot = await getDocs(collection(db, "customers"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const addCustomer = async (customer: Omit<Customer, "id">) => {
  const clean = sanitizeData(customer as Record<string, unknown>);
  const docRef = await addDoc(collection(db, "customers"), { ...clean, createdAt: new Date() });
  return docRef.id;
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  const clean = sanitizeData(data as Record<string, unknown>);
  const ref = doc(db, "customers", id);
  await updateDoc(ref, clean);
};

export const deleteCustomer = async (id: string) => {
  await deleteDoc(doc(db, "customers", id));
};

// --- BINS ---
export const getBins = async () => {
  const snapshot = await getDocs(collection(db, "bins"));
  const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bin));
  return list.sort((a, b) =>
    (a.identifier || "").localeCompare(b.identifier || "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
};

export const addBin = async (bin: Omit<Bin, "id">) => {
  const clean = sanitizeData(bin as Record<string, unknown>);
  const docRef = await addDoc(collection(db, "bins"), clean);
  return docRef.id;
};

export const updateBinStatus = async (id: string, updates: Partial<Bin>) => {
  const clean = sanitizeData(updates as Record<string, unknown>);
  const binRef = doc(db, "bins", id);
  try {
    await updateDoc(binRef, clean);
  } catch (err) {
    // Il bin può essere stato eliminato (es. reset del parco bins): non bloccare le operazioni sulle pesate
    if ((err as { code?: string })?.code === "not-found") return;
    throw err;
  }
};

export const deleteBin = async (id: string) => {
  await deleteDoc(doc(db, "bins", id));
};

// Elimina tutti i bins (solo admin)
export const deleteAllBins = async (): Promise<number> => {
  const { writeBatch } = await import("firebase/firestore");
  const snapshot = await getDocs(collection(db, "bins"));
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
};

// Inserimento massivo dei Bins dell'Oleificio (con batch write Firestore e ID deterministico progressivo)
export const createBatchBins = async (
  total = 208,
  capacityKg = 250,
  prefix = "BIN-"
): Promise<number> => {
  const { writeBatch } = await import("firebase/firestore");
  // Firestore supporta max 500 operazioni per batch
  const chunkSize = 200;
  let createdCount = 0;

  for (let i = 1; i <= total; i += chunkSize) {
    const batch = writeBatch(db);
    const end = Math.min(i + chunkSize - 1, total);
    for (let num = i; num <= end; num++) {
      const paddedNum = num.toString().padStart(3, "0");
      const identifier = `${prefix}${paddedNum}`;
      // Usiamo identifier come ID univoco del documento Firestore: ordinamento e unicità perfetti
      const docRef = doc(db, "bins", identifier);
      batch.set(docRef, {
        identifier,
        binNumber: num,
        capacityKg,
        status: "AVAILABLE",
        createdAt: new Date(),
      });
      createdCount++;
    }
    await batch.commit();
  }

  return createdCount;
};

// --- BATCHES ---
export const getBatches = async () => {
  const snapshot = await getDocs(collection(db, "batches"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
};

export const addBatch = async (batch: Omit<Batch, "id">) => {
  const clean = sanitizeData(batch as Record<string, unknown>);
  const docRef = await addDoc(collection(db, "batches"), { ...clean, createdAt: new Date() });
  return docRef.id;
};

export const updateBatch = async (id: string, data: Partial<Batch>) => {
  const clean = sanitizeData(data as Record<string, unknown>);
  await updateDoc(doc(db, "batches", id), clean);
};

export const deleteBatch = async (id: string) => {
  await deleteDoc(doc(db, "batches", id));
};

// --- WEIGHINGS ---
export const getWeighingsForBatch = async (batchId: string) => {
  const q = query(collection(db, "weighings"), where("batchId", "==", batchId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Weighing));
};

export const addWeighing = async (weighing: Omit<Weighing, "id">) => {
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(weighing)) {
    if (value !== undefined) cleanData[key] = value;
  }
  const docRef = await addDoc(collection(db, "weighings"), { ...cleanData, createdAt: new Date() });
  return docRef.id;
};

export const updateWeighing = async (id: string, data: Partial<Weighing>) => {
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  await updateDoc(doc(db, "weighings", id), cleanData);
};

export const deleteWeighing = async (id: string) => {
  await deleteDoc(doc(db, "weighings", id));
};

// --- MILLING ---
export const getMillingForBatch = async (batchId: string) => {
  const q = query(collection(db, "millings"), where("batchId", "==", batchId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Milling;
};

export const addMilling = async (milling: Omit<Milling, "id">) => {
  const docRef = await addDoc(collection(db, "millings"), { ...milling, createdAt: new Date() });
  return docRef.id;
};

// --- BATCHES UPDATE ---
export const updateBatchStatus = async (id: string, status: string) => {
  const batchRef = doc(db, "batches", id);
  await updateDoc(batchRef, { status });
};

// --- CONTAINERS ---
export const getContainers = async () => {
  const snapshot = await getDocs(collection(db, "containers"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Container));
};

export const addContainer = async (container: Omit<Container, "id">) => {
  const docRef = await addDoc(collection(db, "containers"), container);
  return docRef.id;
};

export const updateContainerLiters = async (id: string, newCurrentLiters: number) => {
  const containerRef = doc(db, "containers", id);
  await updateDoc(containerRef, { currentLiters: newCurrentLiters });
};

export const deleteContainer = async (id: string) => {
  await deleteDoc(doc(db, "containers", id));
};

