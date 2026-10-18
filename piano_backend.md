# 🗄️ Piano Sviluppo – Backend & Database (Sprint 1-4)

> Basato sull'analisi del codice esistente in `c:\Users\spita\Documents\Software Oleificio`

---

## 📊 Stato Attuale del Codebase

| Componente | Stato | Note |
| :--- | :---: | :--- |
| Next.js 16 + TypeScript | ✅ | Funzionante |
| Firebase / Firestore | ✅ | Configurato con progetto `oleificio-30b84` |
| Collezioni Firestore | ✅ Parziale | `customers`, `bins`, `batches`, `weighings`, `millings`, `containers` |
| Firebase Authentication | ❌ | **Assente** – da aggiungere |
| Ruoli Admin / Dipendente | ❌ | **Assente** – nessun RBAC |
| Firestore Security Rules | ⚠️ | Aperte a tutti (`allow read, write: if true`) – **pericoloso in produzione** |
| Pagamenti & Tag Saldo | ❌ | **Assente** |
| Agenda / Appuntamenti | ❌ | **Assente** |
| Centro Notifiche | ❌ | **Assente** |
| Notifiche Email/SMS fallback | ❌ | **Assente** |
| PDF Dichiarazione | ❌ | **Assente** |

---

## 🔧 Sprint 1 – Firebase Auth & Sistema Ruoli

### 1.1 Abilitare Firebase Authentication
File da creare / modificare:
- **`src/lib/firebase.ts`** → aggiungere `getAuth`
- **`src/lib/authService.ts`** → funzioni login, logout, register, getCurrentUser
- **`src/context/AuthContext.tsx`** → Provider React con `user` e `role`
- **`src/app/login/page.tsx`** → Pagina di login protetta

### 1.2 Struttura Profilo Utente (Firestore)
Nuova collezione **`users/{uid}`**:
```ts
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'dipendente';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}
```

### 1.3 Firestore Security Rules (RBAC)
Sostituire le regole aperte con regole basate su ruolo:
```
- customers: read/write Admin | read Dipendente
- payments: read/write Admin ONLY
- appointments: read/write Admin | read Dipendente  
- notifications: read/write Admin | write Dipendente (solo creazione)
- batches / weighings / millings / bins: read/write entrambi
- containers: read/write Admin | read Dipendente
- users/{uid}: read/write Admin | solo self per Dipendente
```

### 1.4 Route Guard Next.js
- **`src/middleware.ts`** → reindirizza a `/login` se non autenticato

---

## 🏗️ Sprint 2 – Estensione Schema Firestore

### 2.1 Estendere la Collezione `customers`
Aggiungere campi a [`src/types/index.ts`](file:///c:/Users/spita/Documents/Software%20Oleificio/src/types/index.ts):
```ts
interface Customer {
  // === CAMPI ESISTENTI ===
  id?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  vatNumber?: string;        // P.IVA
  createdAt?: Timestamp;

  // === NUOVI CAMPI ===
  fiscalCode?: string;       // Codice Fiscale
  address?: string;          // Indirizzo completo
  city?: string;
  notes?: string;            // Note libere Admin
  
  // Dichiarazione
  declarationStatus: 'pending' | 'printed' | 'signed';
  declarationFileUrl?: string;  // URL Firebase Storage
  declarationGeneratedAt?: Timestamp;

  // Contatori rapidi (denormalizzazione per performance)
  totalMillings: number;         // numero macine totale
  totalOlivesKg: number;         // kg olive conferiti totale
  lastMillingDate?: Timestamp;   // data ultima molitura
  lastMillingStatus?: 'pending' | 'in_progress' | 'completed';
}
```

### 2.2 Nuova Collezione `payments`
```ts
interface Payment {
  id?: string;
  customerId: string;
  batchId: string;           // partita di riferimento
  weighingId?: string;       // pesata specifica (opzionale)
  
  status: 'unpaid' | 'partial' | 'paid';
  
  totalAmount?: number;      // importo totale dovuto (€)
  partialAmount?: number;    // acconto versato (€)
  paidAmount?: number;       // saldo finale (€)
  
  partialDate?: Timestamp;   // data acconto
  paidDate?: Timestamp;      // data saldo completo
  
  paymentMethod?: 'cash' | 'transfer' | 'check';
  adminNotes?: string;       // note riservate admin
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.3 Nuova Collezione `appointments` (Agenda)
```ts
interface Appointment {
  id?: string;
  customerId?: string;       // cliente collegato (opzionale per slot liberi)
  title: string;
  description?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  type: 'conferimento' | 'molitura' | 'ritiro' | 'altro';
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;         // uid dell'Admin
  createdAt: Timestamp;
}
```

### 2.4 Nuova Collezione `notifications`
```ts
interface Notification {
  id?: string;
  type: 'new_batch' | 'new_weighing' | 'new_customer' | 'payment_update';
  title: string;
  body: string;
  
  customerId?: string;
  batchId?: string;
  
  createdBy: string;         // uid dipendente che ha fatto l'azione
  createdAt: Timestamp;
  
  // Stato lettura Admin
  isRead: boolean;
  readAt?: Timestamp;
}
```

### 2.5 Estendere `batches`
```ts
interface Batch {
  // === ESISTENTI ===
  id?: string;
  status: 'OPEN' | 'CLOSED';
  customerId: string;
  createdAt: Timestamp;

  // === NUOVI ===
  createdByUid: string;       // uid dipendente che ha aperto la partita
  paymentId?: string;         // link al documento payment
  millingStatus?: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}
```

### 2.6 Estendere `weighings`
```ts
interface Weighing {
  // === ESISTENTI ===
  id?: string;
  weightKg: number;
  batchId: string;
  createdAt: Timestamp;

  // === NUOVI ===
  grossWeightKg?: number;     // peso lordo
  tare?: number;              // tara cassoni
  netWeightKg?: number;       // peso netto (= gross - tare)
  createdByUid: string;       // uid operatore
  notes?: string;
}
```

---

## 🛠️ Sprint 3 – Layer Servizi (src/lib/)

Nuovi file da creare:

| File | Responsabilità |
| :--- | :--- |
| `src/lib/authService.ts` | login, logout, register, getProfile, updateRole |
| `src/lib/paymentService.ts` | CRUD payments, updateStatus, getPaymentsByCustomer |
| `src/lib/agendaService.ts` | CRUD appointments, getByDateRange, getByCustomer |
| `src/lib/notificationService.ts` | addNotification, markAsRead, getUnread (real-time listener) |
| `src/lib/millingService.ts` | esteso da db.ts, aggiunge updateMillingStatus, getMillingSummary |
| `src/lib/pdfService.ts` | generateDeclarationPdf (client-side con jsPDF) |
| `src/context/AuthContext.tsx` | React Context per user + role + loading |

> [!NOTE]
> `db.ts` esistente viene mantenuto e integrato con i nuovi servizi, non riscritto da zero.

---

## 🔔 Sprint 4 – Notifiche & Trigger Cloud Functions

> [!IMPORTANT]
> Le Cloud Functions richiedono il **piano Blaze (pay-as-you-go)** su Firebase. 
> Verificare se l'account del progetto `oleificio-30b84` è già su piano Blaze.

### 4.1 Trigger Automatici (Cloud Functions)
```
onCreate di batches    → crea notification + invia email Admin
onCreate di weighings  → crea notification + invia email Admin
onCreate di customers  → crea notification
```

### 4.2 Email Fallback – Firebase Extension
Usare l'estensione ufficiale **"Trigger Email"** di Firebase (evita di scrivere codice SMTP custom):
- Collezione `mail` → ogni documento triggera l'invio di un'email.
- Configurata con SMTP dell'Admin (Gmail, Outlook, ecc.).

### 4.3 Centro Notifiche In-App (PC Admin)
- `onSnapshot` real-time sulla collezione `notifications` (dove `isRead == false`).
- Badge contatore non lette nella Sidebar.
- Pannello "campanella" con lista cronologica.

---

## 📁 Struttura File Finale Prevista

```
src/
├── app/
│   ├── login/page.tsx           ← NUOVO
│   ├── page.tsx                 ← aggiornare con controllo auth
│   ├── clienti/                 ← aggiornare con nuovi campi
│   ├── partite/                 ← aggiornare con createdByUid
│   ├── agenda/page.tsx          ← NUOVO
│   ├── notifiche/page.tsx       ← NUOVO
│   └── ...
├── components/
│   ├── Sidebar.tsx              ← aggiornare: badge notifiche, link nuove pagine
│   ├── Modal.tsx                ← esistente
│   ├── NotificationBell.tsx     ← NUOVO
│   └── ProtectedRoute.tsx       ← NUOVO
├── context/
│   └── AuthContext.tsx          ← NUOVO
├── lib/
│   ├── firebase.ts              ← aggiornare: aggiungere Auth
│   ├── db.ts                    ← mantenuto + esteso
│   ├── authService.ts           ← NUOVO
│   ├── paymentService.ts        ← NUOVO
│   ├── agendaService.ts         ← NUOVO
│   ├── notificationService.ts   ← NUOVO
│   ├── millingService.ts        ← NUOVO (estende db.ts)
│   └── pdfService.ts            ← NUOVO
├── middleware.ts                 ← NUOVO (route guard)
└── types/
    └── index.ts                 ← aggiornare con tutti i nuovi tipi
```

---

## ✅ Riepilogo Azioni per Sprint

| Sprint | Azione | Priorità |
| :--- | :--- | :---: |
| **1** | Abilitare Firebase Auth nel progetto Firebase Console | 🔴 Prima di tutto |
| **1** | Aggiornare `firebase.ts` con `getAuth` | 🔴 |
| **1** | Creare `AuthContext.tsx` + `authService.ts` | 🔴 |
| **1** | Creare pagina `/login` | 🔴 |
| **1** | Creare `middleware.ts` (route guard) | 🔴 |
| **1** | Aggiornare `firestore.rules` con RBAC | 🔴 |
| **2** | Aggiornare `types/index.ts` con tutti i nuovi tipi | 🟡 |
| **2** | Creare `paymentService.ts` | 🟡 |
| **2** | Creare `agendaService.ts` | 🟡 |
| **2** | Creare `notificationService.ts` | 🟡 |
| **3** | Creare `pdfService.ts` (client-side jsPDF) | 🟢 |
| **4** | Verificare piano Blaze Firebase | 🟡 |
| **4** | Setup Cloud Functions + Trigger Email Extension | 🟡 |

---

> [!WARNING]
> **Prima di procedere**: è necessario abilitare manualmente **Firebase Authentication** dalla [Firebase Console](https://console.firebase.google.com/) per il progetto `oleificio-30b84`. Senza questo step, lo Sprint 1 non può partire.
