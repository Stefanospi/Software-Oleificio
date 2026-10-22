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
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Notification, NotificationType } from "../types";

const COL = "notifications";

// ─── LETTURA ONE-SHOT ──────────────────────────────────────────────────────────
export const getUnreadNotifications = async (): Promise<Notification[]> => {
  const q = query(
    collection(db, COL),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  return list.sort((a, b) => {
    const timeA = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
    const timeB = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
    return timeB - timeA;
  });
};

export const getAllNotifications = async (limitN = 50): Promise<Notification[]> => {
  const snap = await getDocs(collection(db, COL));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  return list
    .sort((a, b) => {
      const timeA = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    })
    .slice(0, limitN);
};

// ─── REAL-TIME LISTENER (per campanella) ───────────────────────────────────────
export const subscribeToUnreadNotifications = (
  callback: (notifications: Notification[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COL),
    where("isRead", "==", false)
  );
  return onSnapshot(
    q,
    (snap) => {
      const notifications = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Notification))
        .sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt as any).getTime() : Date.now());
          const timeB = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt as any).getTime() : Date.now());
          return timeB - timeA;
        });
      callback(notifications);
    },
    (err) => {
      console.warn("Avviso listener notifiche non lette:", err);
    }
  );
};

// ─── REAL-TIME LISTENER COMPLETO (per pagina /notifiche) ─────────────────────
export const subscribeToAllNotifications = (
  callback: (notifications: Notification[]) => void,
  limitN = 100
): Unsubscribe => {
  const q = collection(db, COL);
  return onSnapshot(
    q,
    (snap) => {
      const notifications = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Notification))
        .sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt as any).getTime() : Date.now());
          const timeB = (b.createdAt as any)?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt as any).getTime() : Date.now());
          return timeB - timeA;
        })
        .slice(0, limitN);
      callback(notifications);
    },
    (err) => {
      console.warn("Avviso listener tutte le notifiche:", err);
    }
  );
};

// ─── CREAZIONE (chiamata dopo ogni azione) ─────────────────────────────────────
export const addNotification = async (
  notification: Omit<Notification, "id" | "createdAt" | "isRead" | "readAt">
): Promise<string> => {
  // Rimuove chiavi con valore undefined per non far fallire Firestore SDK
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(notification)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }

  const docRef = await addDoc(collection(db, COL), {
    ...cleanData,
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── MARK AS READ ──────────────────────────────────────────────────────────────
export const markNotificationRead = async (id: string) => {
  await updateDoc(doc(db, COL, id), {
    isRead: true,
    readAt: serverTimestamp(),
  });
};

export const markAllNotificationsRead = async () => {
  const unread = await getUnreadNotifications();
  const promises = unread
    .filter((n) => n.id)
    .map((n) =>
      updateDoc(doc(db, COL, n.id!), {
        isRead: true,
        readAt: serverTimestamp(),
      })
    );
  await Promise.all(promises);
};

// ─── ELIMINAZIONE ─────────────────────────────────────────────────────────────
export const deleteNotification = async (id: string) => {
  await deleteDoc(doc(db, COL, id));
};

// ─── FACTORY: genera notifica strutturata per azioni comuni ───────────────────
export const buildNotification = (
  type: NotificationType,
  createdBy: string,
  createdByName: string,
  extra: { customerId?: string; batchId?: string; weighingId?: string; customerName?: string; weightKg?: number }
): Omit<Notification, "id" | "createdAt" | "isRead" | "readAt"> => {
  const { customerName = "Cliente", batchId, weighingId, customerId, weightKg } = extra;

  const messages: Record<NotificationType, { title: string; body: string }> = {
    new_batch: {
      title: "🫒 Nuova partita aperta",
      body: `${createdByName} ha aperto una nuova partita per ${customerName}.`,
    },
    new_weighing: {
      title: "⚖️ Nuova pesata registrata",
      body: `${createdByName} ha registrato una pesata${weightKg ? ` di ${weightKg} kg` : ""} per ${customerName}.`,
    },
    new_customer: {
      title: "👤 Nuovo cliente registrato",
      body: `${createdByName} ha aggiunto ${customerName} come nuovo cliente.`,
    },
    payment_update: {
      title: "💶 Pagamento aggiornato",
      body: `Il pagamento per ${customerName} è stato aggiornato.`,
    },
    milling_update: {
      title: "⚙️ Molitura aggiornata",
      body: `Lo stato della molitura per ${customerName} è cambiato.`,
    },
  };

  const payload: Omit<Notification, "id" | "createdAt" | "isRead" | "readAt"> = {
    type,
    ...messages[type],
    createdBy,
    createdByName,
  };

  if (customerId) payload.customerId = customerId;
  if (batchId) payload.batchId = batchId;
  if (weighingId) payload.weighingId = weighingId;

  return payload;
};
