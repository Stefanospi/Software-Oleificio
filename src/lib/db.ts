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

// --- CUSTOMERS ---
export const getCustomers = async () => {
  const snapshot = await getDocs(collection(db, "customers"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const addCustomer = async (customer: Omit<Customer, "id">) => {
  const docRef = await addDoc(collection(db, "customers"), { ...customer, createdAt: new Date() });
  return docRef.id;
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  const ref = doc(db, "customers", id);
  await updateDoc(ref, data);
};

export const deleteCustomer = async (id: string) => {
  await deleteDoc(doc(db, "customers", id));
};

// --- BINS ---
export const getBins = async () => {
  const snapshot = await getDocs(collection(db, "bins"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bin));
};

export const addBin = async (bin: Omit<Bin, "id">) => {
  const docRef = await addDoc(collection(db, "bins"), bin);
  return docRef.id;
};

export const updateBinStatus = async (id: string, updates: Partial<Bin>) => {
  const binRef = doc(db, "bins", id);
  await updateDoc(binRef, updates);
};

export const deleteBin = async (id: string) => {
  await deleteDoc(doc(db, "bins", id));
};

// --- BATCHES ---
export const getBatches = async () => {
  const snapshot = await getDocs(collection(db, "batches"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Batch));
};

export const addBatch = async (batch: Omit<Batch, "id">) => {
  const docRef = await addDoc(collection(db, "batches"), { ...batch, createdAt: new Date() });
  return docRef.id;
};

export const updateBatch = async (id: string, data: Partial<Batch>) => {
  await updateDoc(doc(db, "batches", id), data);
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
  const docRef = await addDoc(collection(db, "weighings"), { ...weighing, createdAt: new Date() });
  return docRef.id;
};

export const updateWeighing = async (id: string, data: Partial<Weighing>) => {
  await updateDoc(doc(db, "weighings", id), data);
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

