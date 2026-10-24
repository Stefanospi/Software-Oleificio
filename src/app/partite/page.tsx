"use client";

import { Plus, Scale, Droplet, Loader2, Trash2, ChevronDown, ChevronUp, AlertTriangle, Pencil, UserRound, Box, X, Search } from "lucide-react";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { deleteField } from "firebase/firestore";
import {
  addBatch, updateBatch, deleteBatch, addCustomer,
  subscribeBatches, subscribeCustomers, subscribeBins, subscribeWeighings, subscribeMillings,
  addWeighing, updateWeighing, deleteWeighing,
  addMilling, updateBatchStatus,
  updateBinStatus,
} from "@/lib/db";
import { Modal } from "@/components/Modal";
import { CustomerSelect } from "@/components/CustomerSelect";
import { useAuth } from "@/context/AuthContext";
import { addNotification, buildNotification } from "@/lib/notificationService";
import type { Batch, Customer, Weighing, Milling, Bin } from "@/types";

// Vista unificata della pesata di una partita: la pesata è unica (peso totale),
// i bins sono solo associati. Le vecchie pesate per singolo bin vengono accorpate.
interface BatchWeighing {
  primary?: Weighing;
  all: Weighing[];
  totalKg: number;
  hasWeight: boolean;
  binIds: string[];
  customerBinNotes: string;
}

const buildBatchWeighing = (list: Weighing[]): BatchWeighing => {
  const sorted = [...list].sort(
    (a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
  );
  const binIds = new Set<string>();
  const notes: string[] = [];
  let totalKg = 0;
  let hasWeight = false;
  for (const w of sorted) {
    if (typeof w.weightKg === "number" && w.weightKg > 0) {
      totalKg += w.weightKg;
      hasWeight = true;
    }
    (w.binIds ?? (w.binId ? [w.binId] : [])).forEach((id) => binIds.add(id));
    const note = w.customerBinNotes || (w.isCustomerBin ? w.binIdentifier : "");
    if (note && !notes.includes(note)) notes.push(note);
  }
  return {
    primary: sorted[0],
    all: sorted,
    totalKg,
    hasWeight,
    binIds: [...binIds],
    customerBinNotes: notes.join(", "),
  };
};

const EMPTY_BATCH_WEIGHING = buildBatchWeighing([]);

export default function PartitePage() {
  return (
    <Suspense fallback={null}>
      <PartiteContent />
    </Suspense>
  );
}

type StatusFilter = "OPEN" | "CLOSED" | "ALL";

function PartiteContent() {
  const { loading: authLoading, user, profile, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const [partite, setPartite] = useState<Batch[]>([]);
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [allWeighings, setAllWeighings] = useState<Weighing[]>([]);
  const [allMillings, setAllMillings] = useState<Milling[]>([]);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Modal nuova partita ──
  // Deep link: /partite?nuova=1&cliente=<id> apre subito la creazione (usato da Dashboard e Clienti)
  const [showNuovaPartita, setShowNuovaPartita] = useState(searchParams.get("nuova") === "1");
  const [newClienteId, setNewClienteId] = useState(searchParams.get("cliente") ?? "");
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickFirst, setQuickFirst] = useState("");
  const [quickLast, setQuickLast] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);

  // ── Filtri elenco ──
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [listSearch, setListSearch] = useState("");
  const [savingPartita, setSavingPartita] = useState(false);

  // ── Modal modifica partita ──
  const [editPartita, setEditPartita] = useState<Batch | null>(null);
  const [editClienteId, setEditClienteId] = useState("");

  // ── Elimina partita ──
  const [deletePartitaId, setDeletePartitaId] = useState<string | null>(null);
  const [deletingPartita, setDeletingPartita] = useState(false);

  // ── Modal pesata unica + bins ──
  const [pesataBatchId, setPesataBatchId] = useState<string | null>(null);
  const [pesataKg, setPesataKg] = useState("");
  const [pesataBinIds, setPesataBinIds] = useState<string[]>([]);
  const [pesataCustomerBinDesc, setPesataCustomerBinDesc] = useState("");
  const [binSearch, setBinSearch] = useState("");
  const [savingPesata, setSavingPesata] = useState(false);
  const [pesataError, setPesataError] = useState<string | null>(null);

  // ── Elimina pesata ──
  const [deleteWeighingBatchId, setDeleteWeighingBatchId] = useState<string | null>(null);

  // ── Modal molitura ──
  const [showMolitura, setShowMolitura] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [molituraLiters, setMolituraLiters] = useState("");
  const [molituraWaterPerc, setMolituraWaterPerc] = useState("60");
  const [molituraPomacePerc, setMolituraPomacePerc] = useState("40");
  const [savingMolitura, setSavingMolitura] = useState(false);

  // Sottoscrizioni real-time: ogni modifica si riflette subito senza ricaricare
  useEffect(() => {
    if (authLoading || !user) return;
    const mark = (key: string) => setReady((r) => (r[key] ? r : { ...r, [key]: true }));
    const unsubs = [
      subscribeBatches((v) => { setPartite(v); mark("batches"); }, () => mark("batches")),
      subscribeCustomers((v) => { setClienti(v); mark("customers"); }, () => mark("customers")),
      subscribeBins((v) => { setBins(v); mark("bins"); }, () => mark("bins")),
      subscribeWeighings((v) => { setAllWeighings(v); mark("weighings"); }, () => mark("weighings")),
      subscribeMillings((v) => { setAllMillings(v); mark("millings"); }, () => mark("millings")),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authLoading, user]);

  const loading = !(ready.batches && ready.customers && ready.bins && ready.weighings && ready.millings);

  const clientiMap = useMemo(() => {
    const m: Record<string, Customer> = {};
    clienti.forEach((c) => { if (c.id) m[c.id] = c; });
    return m;
  }, [clienti]);

  const binsMap = useMemo(() => {
    const m: Record<string, Bin> = {};
    bins.forEach((b) => { if (b.id) m[b.id] = b; });
    return m;
  }, [bins]);

  const weighingByBatch = useMemo(() => {
    const grouped: Record<string, Weighing[]> = {};
    allWeighings.forEach((w) => { (grouped[w.batchId] ||= []).push(w); });
    const result: Record<string, BatchWeighing> = {};
    Object.entries(grouped).forEach(([id, list]) => { result[id] = buildBatchWeighing(list); });
    return result;
  }, [allWeighings]);

  const millingsMap = useMemo(() => {
    const m: Record<string, Milling> = {};
    allMillings.forEach((x) => { m[x.batchId] = x; });
    return m;
  }, [allMillings]);

  const visiblePartite = useMemo(() => {
    const words = listSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return partite.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (words.length === 0) return true;
      const c = clientiMap[p.customerId];
      const hay = `${c?.firstName ?? ""} ${c?.lastName ?? ""} ${c?.companyName ?? ""} ${c?.phone ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [partite, statusFilter, listSearch, clientiMap]);

  const getBW = (batchId?: string) => (batchId && weighingByBatch[batchId]) || EMPTY_BATCH_WEIGHING;

  const releaseBins = (ids: string[]) =>
    Promise.all(ids.map((id) => updateBinStatus(id, { status: "AVAILABLE", customerId: null, batchId: null })));

  // ── PARTITA: Crea ──
  const handleCreatePartita = async () => {
    if (!newClienteId) return;
    setSavingPartita(true);
    try {
      const batchId = await addBatch({ customerId: newClienteId, status: "OPEN", createdByUid: user?.uid || "system" });
      const cliente = clientiMap[newClienteId];
      const clienteNome = cliente ? `${cliente.firstName} ${cliente.lastName}` : "Cliente";
      addNotification(buildNotification("new_batch", user?.uid || "system", profile?.displayName || user?.email || "Dipendente", {
        customerId: newClienteId,
        customerName: clienteNome,
        batchId,
      })).catch(() => {});
      setShowNuovaPartita(false);
      setNewClienteId("");
      // Flusso rapido: apre la partita e propone subito la registrazione di pesata e bins
      setStatusFilter("OPEN");
      setListSearch("");
      setExpandedId(batchId);
      openPesata(batchId);
    } finally { setSavingPartita(false); }
  };

  // ── CLIENTE: creazione rapida direttamente dalla nuova partita ──
  const handleQuickCustomer = async () => {
    if (!quickFirst.trim() || !quickLast.trim()) {
      setQuickError("Nome e cognome sono obbligatori.");
      return;
    }
    setQuickError(null);
    setSavingPartita(true);
    try {
      const phone = quickPhone.trim();
      const id = await addCustomer({
        firstName: quickFirst.trim(),
        lastName: quickLast.trim(),
        ...(phone ? { phone } : {}),
        declarationStatus: "pending",
        totalMillings: 0,
        totalOlivesKg: 0,
      } as Omit<Customer, "id">);
      addNotification(buildNotification("new_customer", user?.uid || "system", profile?.displayName || user?.email || "Dipendente", {
        customerId: id,
        customerName: `${quickFirst} ${quickLast}`.trim(),
      })).catch(() => {});
      setNewClienteId(id);
      setShowQuickCustomer(false);
      setQuickFirst(""); setQuickLast(""); setQuickPhone("");
    } catch (err) {
      console.error("Errore creazione cliente rapido:", err);
      setQuickError("Errore durante il salvataggio del cliente.");
    } finally { setSavingPartita(false); }
  };

  const openPartiteOfNewCustomer = newClienteId
    ? partite.filter((p) => p.status === "OPEN" && p.customerId === newClienteId)
    : [];

  // ── PARTITA: Modifica ──
  const openEditPartita = (p: Batch) => {
    setEditPartita(p);
    setEditClienteId(p.customerId);
  };
  const handleSavePartita = async () => {
    if (!editPartita?.id) return;
    setSavingPartita(true);
    try {
      await updateBatch(editPartita.id, { customerId: editClienteId });
      // I bins già associati seguono il nuovo cliente
      await Promise.all(
        getBW(editPartita.id).binIds.map((id) => updateBinStatus(id, { customerId: editClienteId }))
      );
      setEditPartita(null);
    } finally { setSavingPartita(false); }
  };

  // ── PARTITA: Elimina ──
  const handleDeletePartita = async (id: string) => {
    setDeletingPartita(true);
    try {
      const bw = getBW(id);
      await releaseBins(bw.binIds);
      await Promise.all(bw.all.map((w) => (w.id ? deleteWeighing(w.id) : Promise.resolve())));
      await deleteBatch(id);
      setDeletePartitaId(null);
      if (expandedId === id) setExpandedId(null);
    } finally { setDeletingPartita(false); }
  };

  // ── PESATA: salvataggio unico (peso totale opzionale + bins associati) ──
  const persistBatchWeighing = async (
    batchId: string,
    kg: number | undefined,
    binIds: string[],
    customerBinNotes: string
  ) => {
    const partita = partite.find((p) => p.id === batchId);
    if (!partita) return;
    const bw = getBW(batchId);
    const binIdentifiers = binIds.map((id) => binsMap[id]?.identifier).filter((x): x is string => !!x);
    const removed = bw.binIds.filter((id) => !binIds.includes(id));
    const added = binIds.filter((id) => !bw.binIds.includes(id));

    await releaseBins(removed);
    await Promise.all(
      added.map((id) =>
        updateBinStatus(id, { status: "LOADED", customerId: partita.customerId, batchId })
      )
    );

    const payload = {
      weightKg: kg ?? deleteField(),
      binIds,
      binIdentifiers,
      customerBinNotes: customerBinNotes || deleteField(),
      updatedAt: new Date(),
    };

    if (bw.primary?.id) {
      // I campi della vecchia pesata per singolo bin vengono rimossi
      await updateWeighing(bw.primary.id, {
        ...payload,
        binId: deleteField(),
        binIdentifier: deleteField(),
        isCustomerBin: deleteField(),
        binType: deleteField(),
      } as unknown as Partial<Weighing>);
      // Eventuali pesate extra (modello precedente) sono già accorpate nella principale
      await Promise.all(bw.all.slice(1).map((w) => (w.id ? deleteWeighing(w.id) : Promise.resolve())));
    } else {
      const wid = await addWeighing({
        batchId,
        weightKg: kg,
        binIds,
        binIdentifiers,
        customerBinNotes: customerBinNotes || undefined,
        createdByUid: user?.uid || "system",
      });
      const cliente = clientiMap[partita.customerId];
      addNotification(buildNotification("new_weighing", user?.uid || "system", profile?.displayName || user?.email || "Dipendente", {
        batchId,
        weighingId: wid,
        customerName: cliente ? `${cliente.firstName} ${cliente.lastName}` : "Cliente",
        weightKg: kg,
      })).catch(() => {});
    }
  };

  // ── PESATA: Apri modal ──
  const openPesata = (batchId: string) => {
    const bw = getBW(batchId);
    setPesataBatchId(batchId);
    setPesataKg(bw.hasWeight ? String(bw.totalKg) : "");
    setPesataBinIds(bw.binIds);
    setPesataCustomerBinDesc(bw.customerBinNotes);
    setBinSearch("");
    setPesataError(null);
  };

  const handleSavePesata = async () => {
    if (!pesataBatchId) return;
    const trimmed = pesataKg.trim().replace(",", ".");
    const kg = trimmed === "" ? undefined : parseFloat(trimmed);
    if (kg !== undefined && (isNaN(kg) || kg <= 0)) {
      setPesataError("Il peso deve essere un numero maggiore di zero (oppure lascialo vuoto).");
      return;
    }
    setSavingPesata(true);
    setPesataError(null);
    try {
      await persistBatchWeighing(pesataBatchId, kg, pesataBinIds, pesataCustomerBinDesc.trim());
      setPesataBatchId(null);
    } catch (err) {
      console.error("Errore salvataggio pesata:", err);
      setPesataError("Errore durante il salvataggio. Riprova.");
    } finally { setSavingPesata(false); }
  };

  // ── BIN: rimuovi da una partita (libera subito il bin) ──
  const handleRemoveBinFromBatch = async (batchId: string, binId: string) => {
    const bw = getBW(batchId);
    await persistBatchWeighing(
      batchId,
      bw.hasWeight ? bw.totalKg : undefined,
      bw.binIds.filter((id) => id !== binId),
      bw.customerBinNotes
    );
  };

  // ── PESATA: Elimina ──
  const handleDeleteWeighing = async (batchId: string) => {
    const bw = getBW(batchId);
    await releaseBins(bw.binIds);
    await Promise.all(bw.all.map((w) => (w.id ? deleteWeighing(w.id) : Promise.resolve())));
    setDeleteWeighingBatchId(null);
  };

  // Bins selezionabili per la partita nel modal
  const selectableBins = useMemo(() => {
    const batch = partite.find((p) => p.id === pesataBatchId);
    if (!batch) return [];
    const q = binSearch.trim().toLowerCase();
    const rank = (b: Bin) => (pesataBinIds.includes(b.id!) ? 0 : b.customerId === batch.customerId && b.status === "PICKED_UP" ? 1 : 2);
    return bins
      .filter((b) => {
        if (!b.id) return false;
        if (pesataBinIds.includes(b.id)) return true;
        const mine = b.customerId && b.customerId === batch.customerId;
        const free = b.status === "AVAILABLE" || ((b.status === "PICKED_UP" || b.status === "RESERVED") && mine);
        return free && (!q || (b.identifier || "").toLowerCase().includes(q));
      })
      .sort((a, b) => rank(a) - rank(b));
  }, [bins, partite, pesataBatchId, pesataBinIds, binSearch]);

  const toggleBin = (id: string) =>
    setPesataBinIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ── MOLITURA ──
  const handleEseguiMolitura = async () => {
    const litri = parseFloat(molituraLiters);
    const waterPerc = parseFloat(molituraWaterPerc);
    const pomacePerc = parseFloat(molituraPomacePerc);
    if (isNaN(litri) || !selectedBatchId) return;
    setSavingMolitura(true);
    try {
      const bw = getBW(selectedBatchId);
      const totalOlivesKg = bw.totalKg;
      const density = 0.916;
      const oilWeightKg = litri * density;
      const yieldPercentage = totalOlivesKg > 0 ? (oilWeightKg / totalOlivesKg) * 100 : 0;
      const wasteKg = totalOlivesKg - oilWeightKg;
      await addMilling({
        batchId: selectedBatchId,
        totalOlivesWeightKg: totalOlivesKg,
        producedOilLiters: litri,
        oilDensity: density,
        oilWeightKg,
        yieldPercentage,
        wastePercentage: 100,
        waterPercentage: waterPerc,
        pomacePercentage: pomacePerc,
        vegetationWaterKg: wasteKg * (waterPerc / 100),
        pomaceKg: wasteKg * (pomacePerc / 100),
      });
      await updateBatchStatus(selectedBatchId, "CLOSED");

      // Libera i bins utilizzati da questa partita (olive versate nel frantoio)
      await releaseBins(bw.binIds);

      const partita = partite.find(p => p.id === selectedBatchId);
      const cliente = partita?.customerId ? clientiMap[partita.customerId] : null;
      const clienteNome = cliente ? `${cliente.firstName} ${cliente.lastName}` : "Cliente";
      addNotification(buildNotification("milling_update", user?.uid || "system", profile?.displayName || user?.email || "Dipendente", {
        batchId: selectedBatchId,
        customerName: clienteNome,
      })).catch(() => {});
      setShowMolitura(false);
      setMolituraLiters("");
    } finally { setSavingMolitura(false); }
  };

  // Anteprima molitura in tempo reale
  const molituraPreview = useMemo(() => {
    const litri = parseFloat(molituraLiters);
    const waterPerc = parseFloat(molituraWaterPerc);
    const pomacePerc = parseFloat(molituraPomacePerc);
    if (isNaN(litri) || litri <= 0 || !selectedBatchId) return null;
    const totalOlivesKg = (weighingByBatch[selectedBatchId] || EMPTY_BATCH_WEIGHING).totalKg;
    const density = 0.916;
    const oilWeightKg = litri * density;
    const yieldPercentage = totalOlivesKg > 0 ? (oilWeightKg / totalOlivesKg) * 100 : 0;
    const wasteKg = totalOlivesKg - oilWeightKg;
    return {
      totalOlivesKg,
      oilWeightKg: oilWeightKg.toFixed(2),
      yieldPercentage: yieldPercentage.toFixed(2),
      waterKg: (wasteKg * (waterPerc / 100)).toFixed(2),
      pomaceKg: (wasteKg * (pomacePerc / 100)).toFixed(2),
      wasteKg: wasteKg.toFixed(2),
    };
  }, [molituraLiters, molituraWaterPerc, molituraPomacePerc, selectedBatchId, weighingByBatch]);

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Partite e Pesate</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {partite.filter(p => p.status === "OPEN").length} aperte · {partite.filter(p => p.status === "CLOSED").length} chiuse
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNuovaPartita(true)} style={{ padding: "12px 20px", fontSize: 15 }}>
          <Plus size={18} /> Nuova Partita
        </button>
      </div>

      {/* Ricerca e filtri */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Cerca partita per cliente..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([
            ["OPEN", `Aperte (${partite.filter(p => p.status === "OPEN").length})`],
            ["CLOSED", `Chiuse (${partite.filter(p => p.status === "CLOSED").length})`],
            ["ALL", "Tutte"],
          ] as [StatusFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={statusFilter === key ? "btn-primary" : "btn-secondary"}
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : visiblePartite.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          {partite.length === 0
            ? "Nessuna partita registrata. Clicca su \"Nuova Partita\" per iniziare."
            : "Nessuna partita trovata con questi filtri."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visiblePartite.map(partita => {
            const cliente = partita.customerId ? clientiMap[partita.customerId] : null;
            const nomeCliente = cliente ? `${cliente.firstName} ${cliente.lastName}` : "Cliente Sconosciuto";
            const bw = getBW(partita.id);
            const milling = partita.id ? millingsMap[partita.id] : null;
            const isOpen = partita.status === "OPEN";
            const isExpanded = expandedId === partita.id;

            return (
              <div key={partita.id} className="card" style={{ overflow: "hidden" }}>
                {/* Header partita – cliccabile per espandere */}
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid var(--border)" : "none",
                    userSelect: "none",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : partita.id!)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      backgroundColor: isOpen ? "var(--yellow-bg)" : "var(--green-bg)",
                      border: `1px solid ${isOpen ? "var(--yellow-border)" : "var(--green-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>
                      {isOpen ? "⚖️" : "✅"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {nomeCliente}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                        {partita.createdAt?.toDate
                          ? partita.createdAt.toDate().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })
                          : "Data N/D"
                        }
                        {" · "}{bw.binIds.length} bins · {bw.hasWeight ? `${bw.totalKg.toLocaleString("it-IT")} kg` : "peso n/d"}
                        {milling ? ` · ${milling.producedOilLiters} L olio` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${isOpen ? "badge-yellow" : "badge-green"}`}>
                      {isOpen ? "In lavorazione" : "Molita"}
                    </span>
                    {isExpanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Contenuto espanso */}
                {isExpanded && (
                  <div style={{ padding: "18px 20px" }}>

                    {/* Azioni sulla partita stessa */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                      {isOpen && (
                        <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); openEditPartita(partita); }}>
                          <UserRound size={13} /> Cambia Cliente
                        </button>
                      )}
                      {isAdmin && (
                        deletePartitaId === partita.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: "var(--red-text)" }}>Eliminare la partita e la pesata?</span>
                            <button className="btn-danger" disabled={deletingPartita} onClick={() => handleDeletePartita(partita.id!)} style={{ padding: "6px 12px", fontSize: 12 }}>
                              {deletingPartita ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "Sì, elimina"}
                            </button>
                            <button className="btn-secondary" onClick={() => setDeletePartitaId(null)} style={{ padding: "6px 10px", fontSize: 12 }}>Annulla</button>
                          </div>
                        ) : (
                          <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setDeletePartitaId(partita.id!); }}>
                            <Trash2 size={13} /> Elimina Partita
                          </button>
                        )
                      )}
                    </div>

                    {/* Stats molitura */}
                    <div className="responsive-grid-3" style={{ marginBottom: 20 }}>
                      <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                          <Scale size={12} /> Totale Olive
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                          {bw.hasWeight ? bw.totalKg.toLocaleString("it-IT") : "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>kg</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {!bw.hasWeight && <span>Peso non ancora registrato</span>}
                          {bw.customerBinNotes && (
                            <span className="badge badge-yellow" style={{ fontSize: 10, padding: "1px 5px" }}>
                              🚜 Bins Cliente da restituire
                            </span>
                          )}
                          {bw.binIds.length > 0 && (
                            <span className="badge badge-olive" style={{ fontSize: 10, padding: "1px 5px" }}>
                              🏢 {bw.binIds.length} Bins Oleificio
                            </span>
                          )}
                        </div>
                      </div>
                      {milling ? (
                        <>
                          <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--green-bg)", border: "1px solid var(--green-border)" }}>
                            <div style={{ fontSize: 12, color: "var(--green-text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                              <Droplet size={12} /> Olio Prodotto
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-text)" }}>
                              {milling.producedOilLiters} <span style={{ fontSize: 13, fontWeight: 400 }}>L</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--green-text)", marginTop: 2, opacity: 0.8 }}>≈ {milling.oilWeightKg.toFixed(1)} kg</div>
                          </div>
                          <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--blue-bg)", border: "1px solid var(--blue-border)" }}>
                            <div style={{ fontSize: 12, color: "var(--blue-text)", marginBottom: 4 }}>📊 Resa</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue-text)" }}>{milling.yieldPercentage.toFixed(2)}%</div>
                            <div style={{ fontSize: 11, color: "var(--blue-text)", marginTop: 2, opacity: 0.8 }}>
                              Sansa {milling.pomaceKg.toFixed(1)} kg · Acqua {milling.vegetationWaterKg.toFixed(1)} kg
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--surface)", border: "1px dashed var(--border)", gridColumn: "span 2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Dati molitura disponibili dopo la lavorazione</span>
                        </div>
                      )}
                    </div>

                    {/* Pesata unica e bins */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>
                        Pesata e Bins
                      </div>
                      {!bw.primary ? (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>Nessuna pesata registrata.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--surface)", border: "1px solid var(--border)", fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <Scale size={14} color="var(--accent)" />
                            <span style={{ fontWeight: 700 }}>
                              {bw.hasWeight ? `${bw.totalKg.toLocaleString("it-IT")} kg` : "Peso non ancora registrato"}
                            </span>
                            {isOpen && (
                              <button
                                onClick={() => openPesata(partita.id!)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center" }}
                                title="Modifica pesata"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            {isOpen && (deleteWeighingBatchId === partita.id ? (
                              <>
                                <button onClick={() => handleDeleteWeighing(partita.id!)} style={{ fontSize: 11, color: "var(--red-text)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Elimina</button>
                                <button onClick={() => setDeleteWeighingBatchId(null)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                              </>
                            ) : (
                              <button onClick={() => setDeleteWeighingBatchId(partita.id!)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }} title="Elimina pesata">
                                <Trash2 size={12} />
                              </button>
                            ))}
                          </div>
                          {(bw.binIds.length > 0 || bw.customerBinNotes) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              {bw.binIds.map((id) => (
                                <span key={id} className="badge badge-olive" style={{ fontSize: 11, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4 }} title="Bin dell'oleificio">
                                  <Box size={11} />
                                  {binsMap[id]?.identifier || "Bin"}
                                  {isOpen && (
                                    <button
                                      onClick={() => handleRemoveBinFromBatch(partita.id!, id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 0 }}
                                      title="Rimuovi bin dalla partita"
                                    >
                                      <X size={11} />
                                    </button>
                                  )}
                                </span>
                              ))}
                              {bw.customerBinNotes && (
                                <span className="badge badge-yellow" style={{ fontSize: 11, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4 }} title="Bins del cliente (da restituire)">
                                  <UserRound size={11} />
                                  {bw.customerBinNotes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Azioni (solo partita aperta) */}
                    {isOpen && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn-secondary" onClick={() => openPesata(partita.id!)}>
                          <Scale size={15} /> {bw.primary ? "Modifica Pesata e Bins" : "Registra Pesata e Bins"}
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => { setSelectedBatchId(partita.id!); setShowMolitura(true); }}
                          disabled={!bw.hasWeight}
                          title={!bw.hasWeight ? "Registra prima il peso totale della pesata" : ""}
                        >
                          <Droplet size={15} /> Calcola Molitura
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL Nuova Partita ── */}
      <Modal isOpen={showNuovaPartita} onClose={() => setShowNuovaPartita(false)} title="Nuova Partita" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowNuovaPartita(false)}>Annulla</button>
            <button className="btn-primary" onClick={handleCreatePartita} disabled={savingPartita || !newClienteId || showQuickCustomer}>
              {savingPartita && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Crea Partita
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Seleziona Cliente *</label>
          <CustomerSelect customers={clienti} value={newClienteId} onChange={setNewClienteId} autoFocus />
        </div>
        {openPartiteOfNewCustomer.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--yellow-text)", backgroundColor: "var(--yellow-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--yellow-border)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span>⚠️ Questo cliente ha già una partita aperta.</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => {
                setStatusFilter("OPEN");
                setListSearch("");
                setExpandedId(openPartiteOfNewCustomer[0].id!);
                setShowNuovaPartita(false);
                setNewClienteId("");
              }}
            >
              Apri quella esistente
            </button>
          </div>
        )}
        {!showQuickCustomer ? (
          <button type="button" className="btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setShowQuickCustomer(true)}>
            <Plus size={14} /> Cliente nuovo? Registralo qui
          </button>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Nuovo cliente (solo nome e cognome obbligatori)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="text" placeholder="Nome *" value={quickFirst} onChange={(e) => setQuickFirst(e.target.value)} autoFocus />
              <input type="text" placeholder="Cognome *" value={quickLast} onChange={(e) => setQuickLast(e.target.value)} />
            </div>
            <input
              type="tel"
              placeholder="Telefono (opzionale)"
              value={quickPhone}
              onChange={(e) => setQuickPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickCustomer(); }}
            />
            {quickError && <span style={{ fontSize: 12, color: "var(--red-text)" }}>{quickError}</span>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => { setShowQuickCustomer(false); setQuickError(null); }}>Annulla</button>
              <button type="button" className="btn-primary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={handleQuickCustomer} disabled={savingPartita}>
                {savingPartita && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                Salva cliente
              </button>
            </div>
          </div>
        )}
        {clienti.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--yellow-text)", backgroundColor: "var(--yellow-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--yellow-border)", marginTop: 8 }}>
            ⚠️ Nessun cliente registrato. Aggiungi prima un cliente dalla sezione Clienti.
          </p>
        )}
      </Modal>

      {/* ── MODAL Modifica Partita (cambia cliente) ── */}
      <Modal isOpen={!!editPartita} onClose={() => setEditPartita(null)} title="Modifica Partita" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditPartita(null)}>Annulla</button>
            <button className="btn-primary" onClick={handleSavePartita} disabled={savingPartita || !editClienteId}>
              {savingPartita && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Salva
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Cliente assegnato</label>
          <CustomerSelect customers={clienti} value={editClienteId} onChange={setEditClienteId} autoFocus />
        </div>
      </Modal>

      {/* ── MODAL Pesata unica + Bins ── */}
      <Modal
        isOpen={!!pesataBatchId}
        onClose={() => setPesataBatchId(null)}
        title={pesataBatchId && getBW(pesataBatchId).primary ? "Modifica Pesata e Bins" : "Registra Pesata e Bins"}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPesataBatchId(null)}>Annulla</button>
            <button className="btn-primary" onClick={handleSavePesata} disabled={savingPesata}>
              {savingPesata && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Salva
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Peso totale olive (kg) — opzionale</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Es. 1350 (lascia vuoto se non ancora pesato)"
            value={pesataKg}
            onChange={(e) => setPesataKg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePesata(); }}
            min={0.1}
            step={0.1}
            autoFocus
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
            La pesata è unica per tutta la partita: inserisci il peso totale, non quello dei singoli bins.
          </span>
        </div>

        <div className="form-group">
          <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
            <Box size={14} color="var(--accent)" />
            Bins dell&apos;oleificio utilizzati ({pesataBinIds.length})
          </label>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Cerca bin e premi Invio per aggiungerlo (es. 45)..."
              value={binSearch}
              onChange={(e) => setBinSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const q = binSearch.trim();
                if (!q) return;
                // Invio aggiunge il bin con quel numero esatto (o l'unico risultato)
                const exact = selectableBins.find((b) => /^\d+$/.test(q) && b.identifier.replace(/\D/g, "") !== "" && parseInt(b.identifier.replace(/\D/g, ""), 10) === parseInt(q, 10));
                const target = exact ?? (selectableBins.length === 1 ? selectableBins[0] : undefined);
                if (target?.id) { toggleBin(target.id); setBinSearch(""); }
              }}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectableBins.length === 0 ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)", padding: 6 }}>Nessun bin disponibile.</span>
            ) : selectableBins.map((b) => {
              const selected = pesataBinIds.includes(b.id!);
              const pickedUp = b.status === "PICKED_UP" || b.status === "RESERVED";
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBin(b.id!)}
                  className={selected ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "5px 10px", fontSize: 12, fontFamily: "monospace" }}
                  title={pickedUp ? "Già ritirato dal cliente" : undefined}
                >
                  {b.identifier}{pickedUp && !selected ? " 🚜" : ""}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
            I bins selezionati risultano CARICHI fino alla molitura. 🚜 = bin già ritirato dal cliente prima della pesata.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Bins propri del cliente (da restituire) — opzionale</label>
          <input
            type="text"
            onKeyDown={(e) => { if (e.key === "Enter") handleSavePesata(); }}
            placeholder="Es. 3 cassoni gialli del cliente"
            value={pesataCustomerBinDesc}
            onChange={(e) => setPesataCustomerBinDesc(e.target.value)}
          />
        </div>

        {pesataError && (
          <p style={{ fontSize: 12, color: "var(--red-text)", backgroundColor: "var(--red-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--red-border)", marginTop: 12 }}>
            {pesataError}
          </p>
        )}
      </Modal>

      {/* ── MODAL Molitura ── */}
      <Modal isOpen={showMolitura} onClose={() => setShowMolitura(false)} title="Calcolo Molitura" size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowMolitura(false)}>Annulla</button>
            <button className="btn-primary" onClick={handleEseguiMolitura} disabled={savingMolitura || !molituraLiters}>
              {savingMolitura && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Termina e Chiudi Partita
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Litri di Olio Prodotti *</label>
          <input type="number" placeholder="Es. 150" value={molituraLiters} onChange={e => setMolituraLiters(e.target.value)} min={0} step={0.1} autoFocus />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>% Acqua di Vegetazione</label>
            <input type="number" value={molituraWaterPerc} onChange={e => setMolituraWaterPerc(e.target.value)} min={0} max={100} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>% Sansa</label>
            <input type="number" value={molituraPomacePerc} onChange={e => setMolituraPomacePerc(e.target.value)} min={0} max={100} />
          </div>
        </div>

        {molituraPreview ? (
          <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--green-border)", backgroundColor: "var(--green-bg)", padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green-text)", marginBottom: 12 }}>
              📊 Anteprima Calcoli
            </div>
            <div className="responsive-grid-2">
              {[
                { label: "Olive totali", value: `${molituraPreview.totalOlivesKg} kg` },
                { label: "Olio (peso)", value: `${molituraPreview.oilWeightKg} kg` },
                { label: "Resa effettiva", value: `${molituraPreview.yieldPercentage}%`, highlight: true },
                { label: "Scarto totale", value: `${molituraPreview.wasteKg} kg` },
                { label: "Acqua vegetaz.", value: `${molituraPreview.waterKg} kg` },
                { label: "Sansa", value: `${molituraPreview.pomaceKg} kg` },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px dashed var(--green-border)" }}>
                  <span style={{ color: "var(--green-text)", opacity: 0.8 }}>{item.label}</span>
                  <span style={{ fontWeight: item.highlight ? 700 : 600, color: "var(--green-text)", fontSize: item.highlight ? 14 : 13 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: "var(--radius-md)", border: "1px dashed var(--border)", backgroundColor: "var(--surface)", padding: 16, textAlign: "center" }}>
            <AlertTriangle size={20} color="var(--text-muted)" style={{ marginBottom: 6 }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Inserisci i litri prodotti per vedere l&apos;anteprima dei calcoli</p>
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--red-text)", backgroundColor: "var(--red-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--red-border)", marginTop: 16 }}>
          ⚠️ Questa operazione chiuderà definitivamente la partita. Non sarà possibile aggiungere altre pesate.
        </p>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
