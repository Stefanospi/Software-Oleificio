"use client";

import { Plus, User, Loader2, Search, Pencil, Trash2, Phone, Mail, Hash } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { Customer } from "@/types";

const EMPTY_FORM = { firstName: "", lastName: "", phone: "", email: "", vatNumber: "" };

export default function ClientiPage() {
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal stato
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { fetchClienti(); }, []);

  const fetchClienti = async () => {
    try {
      const data = await getCustomers();
      setClienti(data);
    } catch (error) {
      console.error("Errore nel caricamento clienti:", error);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id!);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone || "",
      email: c.email || "",
      vatNumber: c.vatNumber || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          vatNumber: form.vatNumber.trim() || undefined,
        });
      } else {
        await addCustomer({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          vatNumber: form.vatNumber.trim() || undefined,
          declarationStatus: "pending",
          totalMillings: 0,
          totalOlivesKg: 0,
        });
      }
      setModalOpen(false);
      await fetchClienti();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      await fetchClienti();
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filtered = useMemo(() =>
    clienti.filter(c =>
      `${c.firstName} ${c.lastName} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(search.toLowerCase())
    ), [clienti, search]);

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Clienti</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {clienti.length} clienti registrati
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={17} />
          Nuovo Cliente
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Cerca per nome, telefono, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42, maxWidth: 380 }}
        />
      </div>

      {/* Tabella */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 220 }}>
            <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nominativo</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>P.IVA / C.F.</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                      {search ? "Nessun cliente trovato per la ricerca." : "Nessun cliente registrato. Clicca su \"Nuovo Cliente\" per iniziare."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            backgroundColor: "var(--accent-light)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <User size={15} color="var(--accent)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {cliente.firstName} {cliente.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {cliente.phone
                          ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}><Phone size={12} />{cliente.phone}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        {cliente.email
                          ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}><Mail size={12} />{cliente.email}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        {cliente.vatNumber
                          ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 13 }}><Hash size={12} />{cliente.vatNumber}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                          <button className="btn-ghost" onClick={() => openEdit(cliente)} style={{ padding: "6px 12px" }}>
                            <Pencil size={13} />
                            Modifica
                          </button>
                          {deleteConfirmId === cliente.id ? (
                            <div style={{ display: "flex", gap: 5 }}>
                              <button className="btn-danger" onClick={() => handleDelete(cliente.id!)} style={{ padding: "6px 12px", fontSize: 12 }}>
                                Conferma
                              </button>
                              <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ padding: "6px 10px", fontSize: 12 }}>
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button className="btn-danger" onClick={() => setDeleteConfirmId(cliente.id!)} style={{ padding: "6px 12px" }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Aggiungi / Modifica */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Cliente" : "Nuovo Cliente"}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Annulla</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
            >
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {editingId ? "Salva Modifiche" : "Crea Cliente"}
            </button>
          </>
        }
      >
        <div className="form-row form-row-2" style={{ marginBottom: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nome *</label>
            <input type="text" placeholder="Es. Mario" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cognome *</label>
            <input type="text" placeholder="Es. Rossi" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Telefono</label>
          <input type="tel" placeholder="Es. 340 1234567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Es. mario.rossi@email.it" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>P.IVA / Codice Fiscale</label>
          <input type="text" placeholder="Es. RSSMRA80A01H501Z" value={form.vatNumber} onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))} />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>* Campi obbligatori</p>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
