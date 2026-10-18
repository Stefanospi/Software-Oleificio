"use client";

import { Plus, Loader2, Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useState, useEffect } from "react";
import { getContainers, addContainer, updateContainerLiters, deleteContainer } from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { Container } from "@/types";

export default function ContenitoriPage() {
  const [contenitori, setContenitori] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nuovo contenitore
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal versa / preleva
  const [operazione, setOperazione] = useState<{ type: "versa" | "preleva"; contenitore: Container } | null>(null);
  const [opAmount, setOpAmount] = useState("");

  // Elimina
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { fetchContenitori(); }, []);

  const fetchContenitori = async () => {
    try {
      const data = await getContainers();
      setContenitori(data);
    } catch (e) {
      console.error("Errore caricamento contenitori:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContenitore = async () => {
    if (!newName.trim() || !newCapacity) return;
    const cap = parseFloat(newCapacity);
    if (isNaN(cap) || cap <= 0) return;
    setSaving(true);
    try {
      await addContainer({ identifier: newName.trim(), capacityLiters: cap, currentLiters: 0 });
      setShowNew(false);
      setNewName("");
      setNewCapacity("");
      await fetchContenitori();
    } finally { setSaving(false); }
  };

  const handleOperazione = async () => {
    if (!operazione || !opAmount) return;
    const amount = parseFloat(opAmount);
    if (isNaN(amount) || amount <= 0) return;
    const { type, contenitore } = operazione;
    let newLiters: number;
    if (type === "versa") {
      newLiters = Math.min(contenitore.currentLiters + amount, contenitore.capacityLiters);
    } else {
      newLiters = Math.max(contenitore.currentLiters - amount, 0);
    }
    setSaving(true);
    try {
      await updateContainerLiters(contenitore.id!, newLiters);
      setOperazione(null);
      setOpAmount("");
      await fetchContenitori();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteContainer(id);
    setDeleteConfirmId(null);
    await fetchContenitori();
  };

  const totaleOlio = contenitori.reduce((acc, c) => acc + c.currentLiters, 0);
  const totaleCapacita = contenitori.reduce((acc, c) => acc + c.capacityLiters, 0);

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Contenitori e Stoccaggio</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {totaleOlio.toLocaleString("it-IT")} L su {totaleCapacita.toLocaleString("it-IT")} L totali
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={17} />
          Nuovo Contenitore
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : contenitori.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          Nessun contenitore registrato. Clicca su &quot;Nuovo Contenitore&quot; per iniziare.
        </div>
      ) : (
        <div className="responsive-grid-auto-fill">
          {contenitori.map(contenitore => {
            const perc = contenitore.capacityLiters > 0
              ? (contenitore.currentLiters / contenitore.capacityLiters) * 100
              : 0;
            const barColor = perc > 90 ? "#DC4A3F" : perc > 70 ? "#D97706" : "var(--accent)";
            const barBg = perc > 90 ? "var(--red-bg)" : perc > 70 ? "var(--yellow-bg)" : "var(--green-bg)";

            return (
              <div key={contenitore.id} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Titolo */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
                      🛢️ {contenitore.identifier}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Capacità: {contenitore.capacityLiters.toLocaleString("it-IT")} L
                    </div>
                  </div>
                  {deleteConfirmId === contenitore.id ? (
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <button className="btn-danger" onClick={() => handleDelete(contenitore.id!)} style={{ padding: "5px 10px", fontSize: 12 }}>Elimina</button>
                      <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ padding: "5px 8px", fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <button className="btn-danger" onClick={() => setDeleteConfirmId(contenitore.id!)} style={{ padding: "6px 10px" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Barra riempimento */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Olio contenuto</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                        {contenitore.currentLiters.toLocaleString("it-IT")}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>L</span>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 10, backgroundColor: "var(--border)", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(perc, 100)}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 5,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Spazio libero: {(contenitore.capacityLiters - contenitore.currentLiters).toLocaleString("it-IT")} L
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      backgroundColor: barBg,
                      color: barColor,
                    }}>
                      {perc.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Azioni */}
                <div className="responsive-grid-2" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <button
                    onClick={() => { setOperazione({ type: "versa", contenitore }); setOpAmount(""); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "10px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--green-border)",
                      backgroundColor: "var(--green-bg)", color: "var(--green-text)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#D4F5E4")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--green-bg)")}
                  >
                    <ArrowDownToLine size={15} /> Versa Olio
                  </button>
                  <button
                    onClick={() => { setOperazione({ type: "preleva", contenitore }); setOpAmount(""); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "10px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--orange-border)",
                      backgroundColor: "var(--orange-bg)", color: "var(--orange-text)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FDEBD5")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--orange-bg)")}
                  >
                    <ArrowUpFromLine size={15} /> Preleva
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuovo Contenitore */}
      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="Nuovo Contenitore"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Annulla</button>
            <button className="btn-primary" onClick={handleAddContenitore} disabled={saving || !newName.trim() || !newCapacity}>
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Aggiungi
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Nome Contenitore *</label>
          <input type="text" placeholder="Es. Silos 1, Tank A, Vasca Grande" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>Capacità (litri) *</label>
          <input type="number" placeholder="Es. 5000" value={newCapacity} onChange={e => setNewCapacity(e.target.value)} min={1} />
        </div>
      </Modal>

      {/* Modal Versa / Preleva */}
      <Modal
        isOpen={!!operazione}
        onClose={() => setOperazione(null)}
        title={operazione?.type === "versa" ? `⬇️ Versa Olio in ${operazione?.contenitore.identifier}` : `⬆️ Preleva da ${operazione?.contenitore.identifier}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOperazione(null)}>Annulla</button>
            <button
              className="btn-primary"
              style={operazione?.type === "preleva" ? { backgroundColor: "var(--orange-text)", borderColor: "var(--orange-text)" } : {}}
              onClick={handleOperazione}
              disabled={saving || !opAmount}
            >
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              Conferma
            </button>
          </>
        }
      >
        {operazione && (
          <>
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--surface)", border: "1px solid var(--border)", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Attuale</span>
                <span style={{ fontWeight: 700 }}>{operazione.contenitore.currentLiters} L</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                <span style={{ color: "var(--text-muted)" }}>Capacità massima</span>
                <span style={{ fontWeight: 700 }}>{operazione.contenitore.capacityLiters} L</span>
              </div>
              {opAmount && !isNaN(parseFloat(opAmount)) && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Risultato</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {operazione.type === "versa"
                      ? Math.min(operazione.contenitore.currentLiters + parseFloat(opAmount), operazione.contenitore.capacityLiters)
                      : Math.max(operazione.contenitore.currentLiters - parseFloat(opAmount), 0)
                    } L
                  </span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Quantità in litri *</label>
              <input
                type="number"
                placeholder="Es. 150"
                value={opAmount}
                onChange={e => setOpAmount(e.target.value)}
                min={0}
                autoFocus
              />
            </div>
          </>
        )}
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
