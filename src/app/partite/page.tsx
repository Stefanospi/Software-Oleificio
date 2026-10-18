"use client";

import { Plus, Scale, Droplet, Loader2, Trash2, ChevronDown, ChevronUp, AlertTriangle, Pencil, UserRound } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  getBatches, addBatch, updateBatch, deleteBatch,
  getCustomers,
  getWeighingsForBatch, addWeighing, updateWeighing, deleteWeighing,
  getMillingForBatch, addMilling, updateBatchStatus
} from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { Batch, Customer, Weighing, Milling } from "@/types";

export default function PartitePage() {
  const [partite, setPartite] = useState<Batch[]>([]);
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [clientiMap, setClientiMap] = useState<Record<string, Customer>>({});
  const [weighingsMap, setWeighingsMap] = useState<Record<string, Weighing[]>>({});
  const [millingsMap, setMillingsMap] = useState<Record<string, Milling>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Modal nuova partita ──
  const [showNuovaPartita, setShowNuovaPartita] = useState(false);
  const [newClienteId, setNewClienteId] = useState("");
  const [savingPartita, setSavingPartita] = useState(false);

  // ── Modal modifica partita ──
  const [editPartita, setEditPartita] = useState<Batch | null>(null);
  const [editClienteId, setEditClienteId] = useState("");

  // ── Elimina partita ──
  const [deletePartitaId, setDeletePartitaId] = useState<string | null>(null);
  const [deletingPartita, setDeletingPartita] = useState(false);

  // ── Modal pesata (nuova o modifica) ──
  const [pesataModal, setPesataModal] = useState<{ mode: "new" | "edit"; batchId: string; weighing?: Weighing } | null>(null);
  const [pesataKg, setPesataKg] = useState("");
  const [savingPesata, setSavingPesata] = useState(false);

  // ── Elimina pesata ──
  const [deleteWeighingId, setDeleteWeighingId] = useState<string | null>(null);

  // ── Modal molitura ──
  const [showMolitura, setShowMolitura] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [molituraLiters, setMolituraLiters] = useState("");
  const [molituraWaterPerc, setMolituraWaterPerc] = useState("60");
  const [molituraPomacePerc, setMolituraPomacePerc] = useState("40");
  const [savingMolitura, setSavingMolitura] = useState(false);

  useEffect(() => { fetchDati(); }, []);

  const fetchDati = async () => {
    setLoading(true);
    try {
      const [partiteData, clientiData] = await Promise.all([getBatches(), getCustomers()]);
      const cMap: Record<string, Customer> = {};
      clientiData.forEach(c => { if (c.id) cMap[c.id] = c; });
      setClientiMap(cMap);
      setClienti(clientiData);
      setPartite(partiteData);

      const wMap: Record<string, Weighing[]> = {};
      const mMap: Record<string, Milling> = {};
      for (const p of partiteData) {
        if (!p.id) continue;
        wMap[p.id] = await getWeighingsForBatch(p.id);
        if (p.status === "CLOSED") {
          const mData = await getMillingForBatch(p.id);
          if (mData) mMap[p.id] = mData;
        }
      }
      setWeighingsMap(wMap);
      setMillingsMap(mMap);
    } catch (e) {
      console.error("Errore caricamento:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── PARTITA: Crea ──
  const handleCreatePartita = async () => {
    if (!newClienteId) return;
    setSavingPartita(true);
    try {
      await addBatch({ customerId: newClienteId, status: "OPEN", createdByUid: "system" });
      setShowNuovaPartita(false);
      setNewClienteId("");
      await fetchDati();
    } finally { setSavingPartita(false); }
  };

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
      setEditPartita(null);
      await fetchDati();
    } finally { setSavingPartita(false); }
  };

  // ── PARTITA: Elimina ──
  const handleDeletePartita = async (id: string) => {
    setDeletingPartita(true);
    try {
      // Elimina prima le pesate collegate
      const ws = weighingsMap[id] || [];
      await Promise.all(ws.map(w => w.id ? deleteWeighing(w.id) : Promise.resolve()));
      await deleteBatch(id);
      setDeletePartitaId(null);
      if (expandedId === id) setExpandedId(null);
      await fetchDati();
    } finally { setDeletingPartita(false); }
  };

  // ── PESATA: Apri modal ──
  const openNuovaPesata = (batchId: string) => {
    setPesataModal({ mode: "new", batchId });
    setPesataKg("");
  };
  const openEditPesata = (batchId: string, w: Weighing) => {
    setPesataModal({ mode: "edit", batchId, weighing: w });
    setPesataKg(w.weightKg.toString());
  };

  // ── PESATA: Salva (crea o modifica) ──
  const handleSavePesata = async () => {
    if (!pesataModal) return;
    const kg = parseFloat(pesataKg);
    if (isNaN(kg) || kg <= 0) return;
    setSavingPesata(true);
    try {
      if (pesataModal.mode === "new") {
        await addWeighing({ batchId: pesataModal.batchId, weightKg: kg, createdByUid: "system" });
      } else if (pesataModal.weighing?.id) {
        await updateWeighing(pesataModal.weighing.id, { weightKg: kg });
      }
      setPesataModal(null);
      setPesataKg("");
      await fetchDati();
    } finally { setSavingPesata(false); }
  };

  // ── PESATA: Elimina ──
  const handleDeleteWeighing = async (id: string) => {
    await deleteWeighing(id);
    setDeleteWeighingId(null);
    await fetchDati();
  };

  // ── MOLITURA ──
  const handleEseguiMolitura = async () => {
    const litri = parseFloat(molituraLiters);
    const waterPerc = parseFloat(molituraWaterPerc);
    const pomacePerc = parseFloat(molituraPomacePerc);
    if (isNaN(litri) || !selectedBatchId) return;
    setSavingMolitura(true);
    try {
      const weighings = weighingsMap[selectedBatchId] || [];
      const totalOlivesKg = weighings.reduce((acc, w) => acc + w.weightKg, 0);
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
      setShowMolitura(false);
      setMolituraLiters("");
      await fetchDati();
    } finally { setSavingMolitura(false); }
  };

  // Anteprima molitura in tempo reale
  const molituraPreview = useMemo(() => {
    const litri = parseFloat(molituraLiters);
    const waterPerc = parseFloat(molituraWaterPerc);
    const pomacePerc = parseFloat(molituraPomacePerc);
    if (isNaN(litri) || litri <= 0 || !selectedBatchId) return null;
    const weighings = weighingsMap[selectedBatchId] || [];
    const totalOlivesKg = weighings.reduce((acc, w) => acc + w.weightKg, 0);
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
  }, [molituraLiters, molituraWaterPerc, molituraPomacePerc, selectedBatchId, weighingsMap]);

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
        <button className="btn-primary" onClick={() => setShowNuovaPartita(true)}>
          <Plus size={17} /> Nuova Partita
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : partite.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          Nessuna partita registrata. Clicca su &quot;Nuova Partita&quot; per iniziare.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {partite.map(partita => {
            const cliente = partita.customerId ? clientiMap[partita.customerId] : null;
            const nomeCliente = cliente ? `${cliente.firstName} ${cliente.lastName}` : "Cliente Sconosciuto";
            const weighings = partita.id ? weighingsMap[partita.id] || [] : [];
            const totalOlive = weighings.reduce((acc, w) => acc + w.weightKg, 0);
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
                        {" · "}{weighings.length} pesate · {totalOlive.toLocaleString("it-IT")} kg
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
                      {deletePartitaId === partita.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: "var(--red-text)" }}>Eliminare la partita e tutte le pesate?</span>
                          <button className="btn-danger" disabled={deletingPartita} onClick={() => handleDeletePartita(partita.id!)} style={{ padding: "6px 12px", fontSize: 12 }}>
                            {deletingPartita ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "Sì, elimina"}
                          </button>
                          <button className="btn-secondary" onClick={() => setDeletePartitaId(null)} style={{ padding: "6px 10px", fontSize: 12 }}>Annulla</button>
                        </div>
                      ) : (
                        <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setDeletePartitaId(partita.id!); }}>
                          <Trash2 size={13} /> Elimina Partita
                        </button>
                      )}
                    </div>

                    {/* Stats molitura */}
                    <div className="responsive-grid-3" style={{ marginBottom: 20 }}>
                      <div style={{ padding: "14px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                          <Scale size={12} /> Totale Olive
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                          {totalOlive.toLocaleString("it-IT")} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>kg</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{weighings.length} pesate</div>
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

                    {/* Lista pesate */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>
                        Dettaglio Pesate
                      </div>
                      {weighings.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>Nessuna pesata registrata.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {weighings.map((w, i) => (
                            <div key={w.id} style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "7px 12px", borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--surface)", border: "1px solid var(--border)", fontSize: 13,
                            }}>
                              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>#{i + 1}</span>
                              <span style={{ fontWeight: 600 }}>{w.weightKg.toLocaleString("it-IT")} kg</span>
                              {/* Modifica e elimina pesata */}
                              <button
                                onClick={() => openEditPesata(partita.id!, w)}
                                style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center" }}
                                title="Modifica pesata"
                              >
                                <Pencil size={12} />
                              </button>
                              {deleteWeighingId === w.id ? (
                                <>
                                  <button onClick={() => handleDeleteWeighing(w.id!)} style={{ fontSize: 11, color: "var(--red-text)", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Elimina</button>
                                  <button onClick={() => setDeleteWeighingId(null)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                                </>
                              ) : (
                                <button onClick={() => setDeleteWeighingId(w.id!)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }} title="Elimina pesata">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Azioni (solo partita aperta) */}
                    {isOpen && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn-secondary" onClick={() => openNuovaPesata(partita.id!)}>
                          <Scale size={15} /> + Aggiungi Pesata
                        </button>
                        <button
                          className="btn-primary"
                          onClick={() => { setSelectedBatchId(partita.id!); setShowMolitura(true); }}
                          disabled={weighings.length === 0}
                          title={weighings.length === 0 ? "Aggiungi almeno una pesata prima" : ""}
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
            <button className="btn-primary" onClick={handleCreatePartita} disabled={savingPartita || !newClienteId}>
              {savingPartita && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Crea Partita
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Seleziona Cliente *</label>
          <select value={newClienteId} onChange={e => setNewClienteId(e.target.value)} autoFocus>
            <option value="">— Seleziona un cliente —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
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
          <select value={editClienteId} onChange={e => setEditClienteId(e.target.value)} autoFocus>
            <option value="">— Seleziona un cliente —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
      </Modal>

      {/* ── MODAL Pesata (nuova o modifica) ── */}
      <Modal
        isOpen={!!pesataModal}
        onClose={() => setPesataModal(null)}
        title={pesataModal?.mode === "edit" ? "Modifica Pesata" : "Aggiungi Pesata"}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPesataModal(null)}>Annulla</button>
            <button className="btn-primary" onClick={handleSavePesata} disabled={savingPesata || !pesataKg}>
              {savingPesata && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {pesataModal?.mode === "edit" ? "Salva Modifica" : "Aggiungi"}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Peso Olive (kg) *</label>
          <input
            type="number"
            placeholder="Es. 350"
            value={pesataKg}
            onChange={e => setPesataKg(e.target.value)}
            min={0.1}
            step={0.1}
            autoFocus
          />
        </div>
        {pesataModal?.mode === "new" && pesataModal.batchId && (weighingsMap[pesataModal.batchId]?.length ?? 0) > 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Totale attuale: {weighingsMap[pesataModal.batchId].reduce((a, w) => a + w.weightKg, 0)} kg
            ({weighingsMap[pesataModal.batchId].length} pesate)
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
