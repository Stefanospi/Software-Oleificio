"use client";

import { Plus, Box, CheckCircle, Clock, Truck, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getBins, addBin, getCustomers, updateBinStatus, deleteBin } from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { Bin, BinStatus, Customer } from "@/types";

const STATUS_CONFIG: Record<BinStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  AVAILABLE: { label: "Libero", badgeClass: "badge-green", icon: CheckCircle },
  RESERVED:  { label: "Prenotato", badgeClass: "badge-yellow", icon: Clock },
  LOADED:    { label: "Carico", badgeClass: "badge-blue", icon: Truck },
};

export default function BinsPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nuovo bin
  const [showNew, setShowNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal modifica
  const [editBin, setEditBin] = useState<Bin | null>(null);
  const [editStatus, setEditStatus] = useState<BinStatus>("AVAILABLE");
  const [editCustomerId, setEditCustomerId] = useState("");

  // Elimina conferma
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { fetchDati(); }, []);

  const fetchDati = async () => {
    try {
      const [binsData, clientiData] = await Promise.all([getBins(), getCustomers()]);
      setBins(binsData);
      setClienti(clientiData);
    } catch (e) {
      console.error("Errore caricamento:", e);
    } finally {
      setLoading(false);
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
      await fetchDati();
    } finally { setSaving(false); }
  };

  const openEdit = (bin: Bin) => {
    setEditBin(bin);
    setEditStatus(bin.status);
    setEditCustomerId(bin.customerId || "");
  };

  const handleSaveEdit = async () => {
    if (!editBin?.id) return;
    setSaving(true);
    try {
      await updateBinStatus(editBin.id, {
        status: editStatus,
        customerId: editCustomerId || null
      });
      setEditBin(null);
      await fetchDati();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteBin(id);
    setDeleteConfirmId(null);
    await fetchDati();
  };

  const grouped = {
    AVAILABLE: bins.filter(b => b.status === "AVAILABLE"),
    RESERVED:  bins.filter(b => b.status === "RESERVED"),
    LOADED:    bins.filter(b => b.status === "LOADED"),
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
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={17} />
          Nuovo Bin
        </button>
      </div>

      {/* Contatori */}
      <div className="responsive-grid-3" style={{ marginBottom: 28 }}>
        {(["AVAILABLE", "RESERVED", "LOADED"] as BinStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: s === "AVAILABLE" ? "var(--green-bg)" : s === "RESERVED" ? "var(--yellow-bg)" : "var(--blue-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={18} color={s === "AVAILABLE" ? "var(--green-text)" : s === "RESERVED" ? "var(--yellow-text)" : "var(--blue-text)"} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{grouped[s].length}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{cfg.label}</div>
              </div>
            </div>
          );
        })}
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
              {bins.map(bin => {
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
            <option value="LOADED">🚛 Carico</option>
          </select>
        </div>
        <div className="form-group">
          <label>Assegna a Cliente</label>
          <select value={editCustomerId} onChange={e => setEditCustomerId(e.target.value)}>
            <option value="">— Nessuno —</option>
            {clienti.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </div>
        {editStatus === "AVAILABLE" && editCustomerId && (
          <p style={{ fontSize: 12, color: "var(--yellow-text)", backgroundColor: "var(--yellow-bg)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--yellow-border)" }}>
            ⚠️ Impostare lo stato su &quot;Libero&quot; rimuoverà l&apos;associazione al cliente.
          </p>
        )}
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
