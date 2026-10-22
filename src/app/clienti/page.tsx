"use client";

import {
  Plus, User, Loader2, Search, Pencil, Trash2,
  Phone, Mail, Hash, FileText, Filter, ChevronDown, Building2,
  MapPin, Cake, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/db";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { generateDichiarazione } from "@/lib/pdfService";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, DeclarationStatus } from "@/types";

const EMPTY_FORM = {
  firstName: "", lastName: "", companyName: "",
  phone: "", email: "",
  birthCity: "", birthProvince: "", birthDate: "",
  vatNumber: "", fiscalCode: "",
  address: "", addressNumber: "", city: "", province: "",
  notes: "",
};

const DECL_STATUS_CONFIG: Record<DeclarationStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  pending:  { label: "Da stampare", badgeClass: "badge-yellow",  icon: Clock },
  printed:  { label: "Stampata",    badgeClass: "badge-blue",    icon: FileText },
  signed:   { label: "Firmata",     badgeClass: "badge-green",   icon: CheckCircle2 },
};

export default function ClientiPage() {
  const { isAdmin } = useAuth();
  const [clienti, setClienti] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDecl, setFilterDecl] = useState<DeclarationStatus | "all">("all");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      companyName: c.companyName || "",
      phone: c.phone || "",
      email: c.email || "",
      birthCity: c.birthCity || "",
      birthProvince: c.birthProvince || "",
      birthDate: c.birthDate || "",
      vatNumber: c.vatNumber || "",
      fiscalCode: c.fiscalCode || "",
      address: c.address || "",
      addressNumber: c.addressNumber || "",
      city: c.city || "",
      province: c.province || "",
      notes: c.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      const data: Partial<Customer> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        birthCity: form.birthCity.trim() || undefined,
        birthProvince: form.birthProvince.trim() || undefined,
        birthDate: form.birthDate || undefined,
        vatNumber: form.vatNumber.trim() || undefined,
        fiscalCode: form.fiscalCode.trim() || undefined,
        address: form.address.trim() || undefined,
        addressNumber: form.addressNumber.trim() || undefined,
        city: form.city.trim() || undefined,
        province: form.province.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await updateCustomer(editingId, data);
      } else {
        await addCustomer({
          ...data,
          declarationStatus: "pending",
          totalMillings: 0,
          totalOlivesKg: 0,
        } as Omit<Customer, "id">);
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

  const handleGeneratePdf = async (customer: Customer) => {
    if (!customer.id) return;
    setGeneratingPdf(customer.id);
    try {
      await generateDichiarazione(customer);
      // Aggiorna stato dichiarazione a "printed"
      if (!customer.declarationStatus || customer.declarationStatus === "pending") {
        await updateDoc(doc(db, "customers", customer.id), {
          declarationStatus: "printed",
          declarationGeneratedAt: serverTimestamp(),
        });
        setClienti((prev) =>
          prev.map((c) =>
            c.id === customer.id
              ? { ...c, declarationStatus: "printed" as DeclarationStatus }
              : c
          )
        );
      }
    } catch (e) {
      console.error("Errore generazione PDF:", e);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleMarkSigned = async (id: string) => {
    await updateDoc(doc(db, "customers", id), { declarationStatus: "signed" });
    setClienti((prev) =>
      prev.map((c) => c.id === id ? { ...c, declarationStatus: "signed" as DeclarationStatus } : c)
    );
  };

  const setF = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() =>
    clienti.filter((c) => {
      const text = `${c.firstName} ${c.lastName} ${c.phone || ""} ${c.email || ""} ${c.fiscalCode || ""} ${c.vatNumber || ""} ${c.companyName || ""}`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const cStatus = c.declarationStatus || "pending";
      const matchDecl = filterDecl === "all" || cStatus === filterDecl;
      return matchSearch && matchDecl;
    }), [clienti, search, filterDecl]);

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
        {isAdmin && (
          <button className="btn-primary" onClick={openNew}>
            <Plus size={17} />
            Nuovo Cliente
          </button>
        )}
      </div>

      {/* Filtri */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Cerca per nome, telefono, email, CF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>
        <select
          value={filterDecl}
          onChange={(e) => setFilterDecl(e.target.value as DeclarationStatus | "all")}
          style={{ maxWidth: 200 }}
        >
          <option value="all">Tutte le dichiarazioni</option>
          <option value="pending">Da stampare</option>
          <option value="printed">Stampata</option>
          <option value="signed">Firmata</option>
        </select>
      </div>

      {/* Lista clienti */}
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
                  <th>Contatti</th>
                  <th>Codice Fiscale / P.IVA</th>
                  <th>Dichiarazione</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                      {search || filterDecl !== "all"
                        ? "Nessun cliente trovato per i filtri applicati."
                        : "Nessun cliente registrato. Clicca su \"Nuovo Cliente\" per iniziare."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((cliente) => {
                    const status = cliente.declarationStatus || "pending";
                    const declCfg = DECL_STATUS_CONFIG[status] || DECL_STATUS_CONFIG.pending;
                    const DeclIcon = declCfg.icon;
                    const isExpanded = expandedId === cliente.id;

                    return (
                      <>
                        <tr key={cliente.id} style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : cliente.id!)}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%",
                                backgroundColor: "var(--accent-light)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <User size={15} color="var(--accent)" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  {cliente.firstName} {cliente.lastName}
                                </div>
                                {cliente.companyName && (
                                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                    <Building2 size={11} style={{ display: "inline", marginRight: 3 }} />
                                    {cliente.companyName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {cliente.phone && (
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-secondary)" }}>
                                  <Phone size={12} />{cliente.phone}
                                </span>
                              )}
                              {cliente.email && (
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-secondary)" }}>
                                  <Mail size={12} />{cliente.email}
                                </span>
                              )}
                              {!cliente.phone && !cliente.email && <span style={{ color: "var(--text-muted)" }}>—</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {cliente.fiscalCode && (
                                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                                  CF: {cliente.fiscalCode}
                                </span>
                              )}
                              {cliente.vatNumber && (
                                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                                  P.IVA: {cliente.vatNumber}
                                </span>
                              )}
                              {!cliente.fiscalCode && !cliente.vatNumber && <span style={{ color: "var(--text-muted)" }}>—</span>}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${declCfg.badgeClass}`}>
                              <DeclIcon size={12} />
                              {declCfg.label}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                              {/* PDF Dichiarazione — solo Admin */}
                              {isAdmin && (
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "6px 10px", fontSize: 12 }}
                                  onClick={() => handleGeneratePdf(cliente)}
                                  disabled={generatingPdf === cliente.id}
                                  title="Genera dichiarazione PDF"
                                >
                                  {generatingPdf === cliente.id
                                    ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                                    : <FileText size={13} />}
                                  PDF
                                </button>
                              )}
                              {/* Segna come firmata — solo Admin, solo se stampata */}
                              {isAdmin && cliente.declarationStatus === "printed" && (
                                <button
                                  className="btn-ghost"
                                  style={{ padding: "6px 10px", fontSize: 12, borderColor: "var(--green-border)", color: "var(--green-text)" }}
                                  onClick={() => handleMarkSigned(cliente.id!)}
                                >
                                  <CheckCircle2 size={13} />
                                  Firmata
                                </button>
                              )}
                              {/* Modifica — solo Admin */}
                              {isAdmin && (
                                <button className="btn-ghost" onClick={() => openEdit(cliente)} style={{ padding: "6px 12px" }}>
                                  <Pencil size={13} />
                                  Modifica
                                </button>
                              )}
                              {/* Elimina — solo Admin */}
                              {isAdmin && (
                                deleteConfirmId === cliente.id ? (
                                  <div style={{ display: "flex", gap: 5 }}>
                                    <button className="btn-danger" onClick={() => handleDelete(cliente.id!)} style={{ padding: "6px 10px", fontSize: 12 }}>
                                      Conferma
                                    </button>
                                    <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ padding: "6px 10px", fontSize: 12 }}>
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button className="btn-danger" onClick={() => setDeleteConfirmId(cliente.id!)} style={{ padding: "6px 12px" }}>
                                    <Trash2 size={13} />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* Riga espansa con dettagli */}
                        {isExpanded && (
                          <tr key={`${cliente.id}-expanded`}>
                            <td colSpan={5} style={{ padding: "12px 20px", background: "var(--surface)", borderTop: "none" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 24px", fontSize: 13 }}>
                                {cliente.birthCity && (
                                  <div><span style={{ color: "var(--text-muted)" }}>Nato/a a:</span> <strong>{cliente.birthCity} {cliente.birthProvince ? `(${cliente.birthProvince})` : ""}</strong></div>
                                )}
                                {cliente.birthDate && (
                                  <div><span style={{ color: "var(--text-muted)" }}>Data nascita:</span> <strong>{new Date(cliente.birthDate).toLocaleDateString("it-IT")}</strong></div>
                                )}
                                {(cliente.address || cliente.city) && (
                                  <div><span style={{ color: "var(--text-muted)" }}>Indirizzo:</span> <strong>{cliente.address} {cliente.addressNumber}, {cliente.city} {cliente.province ? `(${cliente.province})` : ""}</strong></div>
                                )}
                                {cliente.notes && (
                                  <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "var(--text-muted)" }}>Note:</span> <span style={{ fontStyle: "italic" }}>{cliente.notes}</span></div>
                                )}
                                <div><span style={{ color: "var(--text-muted)" }}>Macine totali:</span> <strong>{cliente.totalMillings}</strong></div>
                                <div><span style={{ color: "var(--text-muted)" }}>Olive conferite:</span> <strong>{cliente.totalOlivesKg} kg</strong></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
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
        size="lg"
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
        {/* Anagrafica base */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Anagrafica
        </p>
        <div className="form-row form-row-2">
          <div className="form-group"><label>Nome *</label><input type="text" value={form.firstName} onChange={setF("firstName")} placeholder="Es. Mario" autoFocus /></div>
          <div className="form-group"><label>Cognome *</label><input type="text" value={form.lastName} onChange={setF("lastName")} placeholder="Es. Rossi" /></div>
        </div>
        <div className="form-group"><label>Ragione Sociale / Azienda</label><input type="text" value={form.companyName} onChange={setF("companyName")} placeholder="Es. Azienda Agricola Rossi" /></div>
        <div className="form-row form-row-2">
          <div className="form-group"><label>Telefono</label><input type="tel" value={form.phone} onChange={setF("phone")} placeholder="Es. 340 1234567" /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={setF("email")} placeholder="Es. mario@email.it" /></div>
        </div>

        {/* Dati nascita */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "16px 0 12px" }}>
          Dati di Nascita (per dichiarazione)
        </p>
        <div className="form-row form-row-3">
          <div className="form-group"><label>Luogo di nascita</label><input type="text" value={form.birthCity} onChange={setF("birthCity")} placeholder="Es. Catania" /></div>
          <div className="form-group"><label>Provincia</label><input type="text" value={form.birthProvince} onChange={setF("birthProvince")} placeholder="Es. CT" maxLength={2} /></div>
          <div className="form-group"><label>Data di nascita</label><input type="date" value={form.birthDate} onChange={setF("birthDate")} /></div>
        </div>

        {/* Dati fiscali */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "16px 0 12px" }}>
          Dati Fiscali
        </p>
        <div className="form-row form-row-2">
          <div className="form-group"><label>Codice Fiscale</label><input type="text" value={form.fiscalCode} onChange={setF("fiscalCode")} placeholder="Es. RSSMRA80A01H501Z" style={{ textTransform: "uppercase" }} /></div>
          <div className="form-group"><label>Partita IVA</label><input type="text" value={form.vatNumber} onChange={setF("vatNumber")} placeholder="Es. 01234567890" /></div>
        </div>

        {/* Indirizzo */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "16px 0 12px" }}>
          Residenza
        </p>
        <div className="form-row form-row-2">
          <div className="form-group"><label>Via/Piazza</label><input type="text" value={form.address} onChange={setF("address")} placeholder="Es. Via Roma" /></div>
          <div className="form-group"><label>Civico</label><input type="text" value={form.addressNumber} onChange={setF("addressNumber")} placeholder="Es. 12" /></div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-group"><label>Comune</label><input type="text" value={form.city} onChange={setF("city")} placeholder="Es. Bronte" /></div>
          <div className="form-group"><label>Provincia</label><input type="text" value={form.province} onChange={setF("province")} placeholder="Es. CT" maxLength={2} /></div>
        </div>

        {/* Note */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "16px 0 12px" }}>
          Note Interne
        </p>
        <div className="form-group">
          <textarea rows={2} value={form.notes} onChange={setF("notes")} placeholder="Note visibili solo agli Admin..." />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>* Campi obbligatori</p>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
