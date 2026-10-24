"use client";

import { Plus, Box, CheckCircle, Clock, Truck, Loader2, Pencil, Trash2, Zap, UserCheck, Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { subscribeBins, subscribeCustomers, addBin, updateBinStatus, deleteBin, deleteAllBins, createBatchBins } from "@/lib/db";
import { Modal } from "@/components/Modal";
import { CustomerSelect } from "@/components/CustomerSelect";
import { useAuth } from "@/context/AuthContext";
import type { Bin, BinStatus, Customer } from "@/types";

const STATUS_CONFIG: Record<BinStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  AVAILABLE: { label: "Libero", badgeClass: "badge-green", icon: CheckCircle },
  RESERVED:  { label: "Prenotato", badgeClass: "badge-yellow", icon: Clock },
  PICKED_UP: { label: "Ritirato dal cliente", badgeClass: "badge-olive", icon: UserCheck },
  LOADED:    { label: "Carico", badgeClass: "badge-blue", icon: Truck },
};

export default function BinsPage() {
  const { isAdmin } = useAuth();
  const [bins, setBins] = useState<Bin[]>([]);
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nuovo bin
  const [showNew, setShowNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal generazione massiva 208 Bins
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCount, setBulkCount] = useState("208");
  const [bulkCapacity, setBulkCapacity] = useState("250");
  const [bulkPrefix, setBulkPrefix] = useState("BIN-");
  const [generatingBulk, setGeneratingBulk] = useState(false);

  // Modal modifica
  const [editBin, setEditBin] = useState<Bin | null>(null);
  const [editStatus, setEditStatus] = useState<BinStatus>("AVAILABLE");
  const [editCustomerId, setEditCustomerId] = useState("");

  // Ricerca e filtro
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BinStatus | "ALL">("ALL");

  // Elimina conferma
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const unsubBins = subscribeBins(
      (data) => { setBins(data); setLoading(false); },
      () => setLoading(false)
    );
    const unsubCustomers = subscribeCustomers(setClienti);
    return () => { unsubBins(); unsubCustomers(); };
  }, []);

  const handleGenerateBulk = async () => {
    const count = parseInt(bulkCount, 10);
    const capacity = parseFloat(bulkCapacity);
    if (isNaN(count) || count <= 0 || isNaN(capacity) || capacity <= 0) return;
    setGeneratingBulk(true);
    try {
      await createBatchBins(count, capacity, bulkPrefix.trim() || "BIN-");
      setShowBulkModal(false);
    } catch (err) {
      console.error("Errore generazione batch bins:", err);
    } finally {
      setGeneratingBulk(false);
    }
  };

  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await deleteAllBins();
      setShowDeleteAll(false);
    } catch (err) {
      console.error("Errore eliminazione bins:", err);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleAddBin = async () => {
    if (!newId.trim() || !newCapacity) return;
    const cap = parseFloat(newCapacity);
    if (isNaN(cap)) return;
    setSaving(true);
    try {
      await addBin({ identifier: newId.trim(), capacityKg: cap, status: "AVAILABLE" });
      setShowNew(false);
      setNewId("");
      setNewCapacity("");
    } finally { setSaving(false); }
  };

  const openEdit = (bin: Bin, presetStatus?: BinStatus) => {
    setEditBin(bin);
    setEditStatus(presetStatus ?? bin.status);
    setEditCustomerId(bin.customerId || "");
  };

  const handleSaveEdit = async () => {
    if (!editBin?.id) return;
    setSaving(true);
    try {
      const hasCustomer = editStatus !== "AVAILABLE" && !!editCustomerId;
      await updateBinStatus(editBin.id, {
        status: editStatus,
        customerId: hasCustomer ? editCustomerId : null,
        ...(editStatus === "AVAILABLE" ? { batchId: null } : {}),
      });
      setEditBin(null);
    } finally { setSaving(false); }
  };

  const handleFree = async (id: string) => {
    await updateBinStatus(id, { status: "AVAILABLE", customerId: null, batchId: null });
  };

  const handleDelete = async (id: string) => {
    await deleteBin(id);
    setDeleteConfirmId(null);
  };

  const sortedBins = useMemo(() => {
    return [...bins].sort((a, b) =>
      (a.identifier || "").localeCompare(b.identifier || "", undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [bins]);

  const visibleBins = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const names = new Map(clienti.map((c) => [c.id, `${c.firstName} ${c.lastName} ${c.companyName ?? ""}`.toLowerCase()]));
    return sortedBins.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      const hay = `${(b.identifier || "").toLowerCase()} ${b.customerId ? names.get(b.customerId) ?? "" : ""}`;
      return words.every((w) => hay.includes(w));
    });
  }, [sortedBins, search, statusFilter, clienti]);

  const grouped = {
    AVAILABLE: sortedBins.filter(b => b.status === "AVAILABLE"),
    RESERVED:  sortedBins.filter(b => b.status === "RESERVED"),
    PICKED_UP: sortedBins.filter(b => b.status === "PICKED_UP"),
    LOADED:    sortedBins.filter(b => b.status === "LOADED"),
  };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Gestione Bins</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {bins.filter(b => b.status !== "AVAILABLE").length} di {bins.length} bins in uso
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {isAdmin && (
            <button
              className="btn-secondary"
              onClick={() => setShowBulkModal(true)}
              style={{ color: "var(--accent)", borderColor: "var(--border)" }}
              title="Genera automaticamente tutti i 208 cassoni dell'oleificio"
            >
              <Zap size={16} />
              Genera 208 Bins in Blocco
            </button>
          )}
          {isAdmin && bins.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => setShowDeleteAll(true)}
              style={{ color: "var(--red-text, #c0392b)" }}
            >
              Elimina tutti i Bins
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={17} />
            Nuovo Bin
          </button>
        </div>
      </div>

      {/* Contatori */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 28 }}>
        {(["AVAILABLE", "RESERVED", "PICKED_UP", "LOADED"] as BinStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <div
              key={s}
              className="card"
              onClick={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
              title="Clicca per filtrare l'elenco"
              style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", outline: statusFilter === s ? "2px solid var(--accent)" : "none" }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: s === "AVAILABLE" ? "var(--green-bg)" : s === "RESERVED" || s === "PICKED_UP" ? "var(--yellow-bg)" : "var(--blue-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} color={s === "AVAILABLE" ? "var(--green-text)" : s === "RESERVED" || s === "PICKED_UP" ? "var(--yellow-text)" : "var(--blue-text)"} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{grouped[s].length}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ricerca */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Cerca per numero bin o nome cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {/* Lista bins */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : bins.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          Nessun bin registrato. Clicca su &quot;Nuovo Bin&quot; per iniziare.
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="data-table">
            <thead>
              <tr>
                <th>Identificativo</th>
                <th>Capacità</th>
                <th>Stato</th>
                <th>Cliente Assegnato</th>
                <th style={{ textAlign: "right" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {visibleBins.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>Nessun bin trovato con questi filtri.</td></tr>
              )}
              {visibleBins.map(bin => {
                const cfg = STATUS_CONFIG[bin.status];
                const Icon = cfg.icon;
                const cliente = clienti.find(c => c.id === bin.customerId);
                return (
                  <tr key={bin.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Box size={15} color="var(--text-muted)" />
                        </div>
                        <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 15, color: "var(--text-primary)" }}>
                          {bin.identifier}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                      {bin.capacityKg.toLocaleString("it-IT")} kg
                    </td>
                    <td>
                      <span className={`badge ${cfg.badgeClass}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {cliente
                        ? <span style={{ fontWeight: 500 }}>{cliente.firstName} {cliente.lastName}</span>
                        : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Nessuno</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        {bin.status === "AVAILABLE" ? (
                          <button className="btn-secondary" onClick={() => openEdit(bin, "PICKED_UP")} style={{ padding: "6px 12px", fontSize: 12 }} title="Il cliente ritira questo bin prima della pesata">
                            <UserCheck size={13} /> Ritira
                          </button>
                        ) : (
                          <button className="btn-secondary" onClick={() => handleFree(bin.id!)} style={{ padding: "6px 12px", fontSize: 12 }} title="Rimetti il bin tra quelli liberi">
                            <CheckCircle size={13} /> Libera
                          </button>
                        )}
                        <button className="btn-ghost" onClick={() => openEdit(bin)} style={{ padding: "6px 12px" }}>
                          <Pencil size={13} /> Modifica
                        </button>
                        {deleteConfirmId === bin.id ? (
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="btn-danger" onClick={() => handleDelete(bin.id!)} style={{ padding: "6px 12px", fontSize: 12 }}>Conferma</button>
                            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ padding: "6px 10px", fontSize: 12 }}>Annulla</button>
                          </div>
                        ) : (
                          <button className="btn-danger" onClick={() => setDeleteConfirmId(bin.id!)} style={{ padding: "6px 12px" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal Nuovo Bin */}
      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="Nuovo Bin"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Annulla</button>
            <button className="btn-primary" onClick={handleAddBin} disabled={saving || !newId.trim() || !newCapacity}>
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Aggiungi Bin
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Identificativo *</label>
          <input type="text" placeholder="Es. BIN-01, C01, Cassone A" value={newId} onChange={e => setNewId(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>Capacità (kg) *</label>
          <input type="number" placeholder="Es. 1200" value={newCapacity} onChange={e => setNewCapacity(e.target.value)} min={0} />
        </div>
      </Modal>

      {/* Modal Modifica Bin */}
      <Modal
        isOpen={!!editBin}
        onClose={() => setEditBin(null)}
        title={`Modifica Bin – ${editBin?.identifier ?? ""}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditBin(null)}>Annulla</button>
            <button className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Salva Modifiche
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Stato del Bin</label>
          <select value={editStatus} onChange={e => setEditStatus(e.target.value as BinStatus)}>
            <option value="AVAILABLE">✅ Libero</option>
            <option value="RESERVED">🕐 Prenotato</option>
            <option value="PICKED_UP">🚜 Ritirato dal cliente (prima della pesata)</option>
            <option value="LOADED">🚛 Carico</option>
          </select>
        </div>
        <div className="form-group">
          <label>Assegna a Cliente</label>
          <CustomerSelect customers={clienti} value={editCustomerId} onChange={setEditCustomerId} allowEmpty placeholder="Cerca cliente (lascia vuoto per nessuno)..." />
        </div>
        {editStatus === "AVAILABLE" && editBin?.customerId && (
          <p style={{ fontSize: 12, color: "var(--yellow-text)", backgroundColor: "var(--yellow-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--yellow-border)" }}>
            ⚠️ Impostare lo stato su &quot;Libero&quot; rimuoverà l&apos;associazione al cliente.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteAll}
        onClose={() => !deletingAll && setShowDeleteAll(false)}
        title="Elimina tutti i Bins"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>Annulla</button>
            <button className="btn-primary" onClick={handleDeleteAll} disabled={deletingAll}>
              {deletingAll && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Elimina {bins.length} bins
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          Verranno eliminati definitivamente tutti i {bins.length} bins, compresi quelli prenotati o carichi. Poi potrai rigenerarli con capacità 250 kg. Le pesate già registrate mantengono l&apos;identificativo del bin. Operazione non reversibile.
        </p>
      </Modal>

      {/* Modal Generazione Massiva 208 Bins */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => !generatingBulk && setShowBulkModal(false)}
        title="Generazione Massiva Bins Oleificio"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowBulkModal(false)} disabled={generatingBulk}>
              Annulla
            </button>
            <button className="btn-primary" onClick={handleGenerateBulk} disabled={generatingBulk}>
              {generatingBulk ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={14} />}
              {generatingBulk ? "Generazione in corso..." : `Genera ${bulkCount} Bins Ora`}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              padding: "12px 14px",
              background: "var(--accent-light)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13,
              color: "var(--text-primary)",
              lineHeight: 1.45,
            }}
          >
            ⚡ Questa procedura genera automaticamente l&apos;intero parco cassoni aziendale dell&apos;oleificio numerati progressivamente in un unico blocco, impostandoli tutti come <strong>Liberi (AVAILABLE)</strong>.
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label>Numero di Bins da creare *</label>
              <input
                type="number"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                min={1}
                max={500}
                placeholder="208"
                disabled={generatingBulk}
              />
            </div>
            <div className="form-group">
              <label>Capacità standard per bin (kg) *</label>
              <input
                type="number"
                value={bulkCapacity}
                onChange={(e) => setBulkCapacity(e.target.value)}
                min={10}
                placeholder="250"
                disabled={generatingBulk}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Prefisso identificativo</label>
            <input
              type="text"
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              placeholder="BIN-"
              disabled={generatingBulk}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Esempio con prefisso &quot;{bulkPrefix}&quot;: <code>{bulkPrefix}001</code> fino a <code>{bulkPrefix}{bulkCount.padStart(3, "0")}</code>.
            </span>
          </div>

          {generatingBulk && (
            <div style={{ textAlign: "center", padding: "16px 0", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
              Salvataggio in batch su Firestore in corso, attendere qualche istante...
            </div>
          )}
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
