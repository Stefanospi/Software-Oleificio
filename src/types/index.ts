import { Timestamp } from "firebase/firestore";

// ─── UTENTI & RUOLI ────────────────────────────────────────────────────────────
export type UserRole = "admin" | "dipendente";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

// ─── CLIENTI ───────────────────────────────────────────────────────────────────
export type DeclarationStatus = "pending" | "printed" | "signed";
export type MillingStatus = "pending" | "in_progress" | "completed";

export interface Customer {
  id?: string;

  // Anagrafica
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  email?: string;

  // Dati nascita (per dichiarazione)
  birthCity?: string;
  birthProvince?: string;
  birthDate?: string; // YYYY-MM-DD

  // Dati fiscali
  vatNumber?: string;
  fiscalCode?: string;
  address?: string;
  addressNumber?: string;
  city?: string;
  province?: string;

  // Note admin
  notes?: string;

  // Dichiarazione
  declarationStatus?: DeclarationStatus;
  declarationFileUrl?: string;
  declarationGeneratedAt?: Timestamp;

  // Contatori denormalizzati
  totalMillings: number;
  totalOlivesKg: number;
  lastMillingDate?: Timestamp;
  lastMillingStatus?: MillingStatus;

  createdAt?: Timestamp;
}

// ─── BINS ──────────────────────────────────────────────────────────────────────
export type BinStatus = "AVAILABLE" | "RESERVED" | "PICKED_UP" | "LOADED";

export interface Bin {
  id?: string;
  identifier: string;
  capacityKg: number;
  status: BinStatus;
  customerId?: string | null;
  batchId?: string | null;
}

// ─── PARTITE ───────────────────────────────────────────────────────────────────
export type BatchStatus = "OPEN" | "CLOSED";

export interface Batch {
  id?: string;
  status: BatchStatus;
  customerId: string;
  createdByUid: string;
  paymentId?: string;
  millingStatus?: MillingStatus;
  notes?: string;
  createdAt?: Timestamp;
}

// ─── PESATE ────────────────────────────────────────────────────────────────────
// Una sola pesata (totale) per partita: i bins sono solo associati, non pesati singolarmente
export interface Weighing {
  id?: string;
  batchId: string;
  weightKg?: number;
  binIds?: string[];
  binIdentifiers?: string[];
  customerBinNotes?: string;
  notes?: string;
  createdByUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // Campi legacy (pesate per singolo bin)
  binId?: string;
  binIdentifier?: string;
  isCustomerBin?: boolean;
  binType?: "oleificio" | "cliente" | "sfuso";
  grossWeightKg?: number;
  tare?: number;
  netWeightKg?: number;
}

// ─── MOLITURA ──────────────────────────────────────────────────────────────────
export interface Milling {
  id?: string;
  batchId: string;
  status?: MillingStatus;
  totalOlivesWeightKg: number;
  producedOilLiters: number;
  oilDensity: number;
  oilWeightKg: number;
  yieldPercentage: number;
  wastePercentage: number;
  waterPercentage: number;
  pomacePercentage: number;
  vegetationWaterKg: number;
  pomaceKg: number;
  completedAt?: Timestamp;
  createdAt?: Timestamp;
}

// ─── CONTENITORI ───────────────────────────────────────────────────────────────
export interface Container {
  id?: string;
  identifier: string;
  capacityLiters: number;
  currentLiters: number;
}

// ─── PAGAMENTI ─────────────────────────────────────────────────────────────────
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "transfer" | "check" | "other";

export interface Payment {
  id?: string;
  customerId: string;
  batchId: string;
  weighingId?: string;
  status: PaymentStatus;
  totalAmount?: number;
  partialAmount?: number;
  paidAmount?: number;
  partialDate?: Timestamp;
  paidDate?: Timestamp;
  paymentMethod?: PaymentMethod;
  adminNotes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ─── AGENDA ────────────────────────────────────────────────────────────────────
export type AppointmentType = "conferimento" | "molitura" | "ritiro" | "altro";
export type AppointmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Appointment {
  id?: string;
  customerId?: string;
  customerName?: string;
  title: string;
  description?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  type: AppointmentType;
  status: AppointmentStatus;
  estimatedOlivesKg?: number;
  notes?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

// ─── NOTIFICHE ─────────────────────────────────────────────────────────────────
export type NotificationType =
  | "new_batch"
  | "new_weighing"
  | "new_customer"
  | "payment_update"
  | "milling_update";

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  customerId?: string;
  batchId?: string;
  weighingId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt?: Timestamp;
  isRead: boolean;
  readAt?: Timestamp;
}
