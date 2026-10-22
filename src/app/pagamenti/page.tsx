"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Calendar,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import {
  getPayments,
  setPaymentPartial,
  setPaymentPaid,
  addPayment,
  updatePayment,
} from "@/lib/paymentService";
import { getCustomers, getBatches } from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { Payment, PaymentStatus, PaymentMethod, Customer, Batch } from "@/types";
import { serverTimestamp } from "firebase/firestore";

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  unpaid: { label: "Non pagato", icon: AlertCircle, color: "#B83228", bg: "#FEF0EF", border: "#F2A49F" },
  partial: { label: "Parziale", icon: Clock, color: "#7A5A00", bg: "#FEF9EC", border: "#F4D86A" },
  paid: { label: "Pagato", icon: CheckCircle2, color: "#1E6B3E", bg: "#EDFAF2", border: "#A3DDBA" },
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Contanti",
  transfer: "Bonifico",
  check: "Assegno",
  other: "Altro",
};

export default function PagamentiPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editStatus, setEditStatus] = useState<PaymentStatus>("unpaid");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editMethod, setEditMethod] = useState<PaymentMethod>("cash");
  const [editNotes, setEditNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, customersData, batchesData] = await Promise.all([
        getPayments(),
        getCustomers(),
        getBatches(),
      ]);
      setPayments(paymentsData);
      setCustomers(customersData);
      setBatches(batchesData);
    } catch (e) {
      console.error("Errore caricamento pagamenti:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const customersMap = useMemo(() => {
    const m: Record<string, Customer> = {};
    customers.forEach((c) => { if (c.id) m[c.id] = c; });
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const customer = customersMap[p.customerId];
      const name = customer ? `${customer.firstName} ${customer.lastName}` : "";
      const matchSearch = name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      const statusOrder = { unpaid: 0, partial: 1, paid: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [payments, search, filterStatus, customersMap]);

  const openEdit = (p: Payment) => {
    setEditPayment(p);
    setEditStatus(p.status);
    setEditTotalAmount(p.totalAmount?.toString() ?? "");
    setEditPaidAmount(p.paidAmount?.toString() ?? "");
    setEditMethod(p.paymentMethod ?? "cash");
    setEditNotes(p.adminNotes ?? "");
  };

  const handleSavePayment = async () => {
    if (!editPayment?.id) return;
    setSaving(true);
    try {
      const updates: Partial<Payment> = {
        status: editStatus,
        totalAmount: editTotalAmount ? Number(editTotalAmount) : undefined,
        paymentMethod: editMethod,
        adminNotes: editNotes || undefined,
      };
      if (editStatus === "partial") {
        updates.partialAmount = editPaidAmount ? Number(editPaidAmount) : undefined;
      } else if (editStatus === "paid") {
        updates.paidAmount = editPaidAmount ? Number(editPaidAmount) : undefined;
      }
      await updatePayment(editPayment.id, updates);
      setEditPayment(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const totalUnpaid = payments.filter((p) => p.status === "unpaid").length;
  const totalPartial = payments.filter((p) => p.status === "partial").length;
  const totalPaid = payments.filter((p) => p.status === "paid").length;

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            Gestione Pagamenti
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Monitora i pagamenti per ogni partita — solo per Admin
          </p>
        </div>
      </div>

      {/* Riepilogo stato */}
      <div className="responsive-grid-3" style={{ marginBottom: 24 }}>
        {([
          { key: "unpaid", count: totalUnpaid },
          { key: "partial", count: totalPartial },
          { key: "paid", count: totalPaid },
        ] as const).map(({ key, count }) => {
          const cfg = STATUS_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <div
              key={key}
              className="card"
              style={{
                padding: "18px 20px",
                cursor: "pointer",
                border: filterStatus === key ? `2px solid ${cfg.color}` : "1px solid var(--border)",
                background: filterStatus === key ? cfg.bg : "var(--bg-card)",
              }}
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon size={20} color={cfg.color} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                    {count}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{cfg.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtri */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Cerca per cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | "all")}
          style={{ maxWidth: 180 }}
        >
          <option value="all">Tutti gli stati</option>
          <option value="unpaid">Non pagato</option>
          <option value="partial">Parziale</option>
          <option value="paid">Pagato</option>
        </select>
      </div>

      {/* Tabella */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <CreditCard size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>Nessun pagamento trovato</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              {payments.length === 0
                ? "I pagamenti verranno creati quando si chiude una partita."
                : "Nessun risultato per i filtri selezionati."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Partita</th>
                  <th>Stato</th>
                  <th>Importo totale</th>
                  <th>Importo saldato</th>
                  <th>Metodo</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const customer = customersMap[p.customerId];
                  const cfg = STATUS_CONFIG[p.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {customer ? `${customer.firstName} ${customer.lastName}` : "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                          {p.batchId.slice(0, 8)}…
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        {p.totalAmount != null
                          ? <strong>€ {p.totalAmount.toFixed(2)}</strong>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        {(p.paidAmount ?? p.partialAmount) != null
                          ? `€ ${(p.paidAmount ?? p.partialAmount)!.toFixed(2)}`
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        {p.paymentMethod ? METHOD_LABELS[p.paymentMethod] : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button className="btn-ghost" style={{ padding: "6px 12px" }} onClick={() => openEdit(p)}>
                            <Pencil size={13} />
                            Aggiorna
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal modifica pagamento */}
      <Modal
        isOpen={editPayment !== null}
        onClose={() => setEditPayment(null)}
        title="Aggiorna Pagamento"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditPayment(null)}>Annulla</button>
            <button className="btn-primary" onClick={handleSavePayment} disabled={saving}>
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Salva
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Stato pagamento</label>
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as PaymentStatus)}>
            <option value="unpaid">🔴 Non pagato</option>
            <option value="partial">🟡 Pagamento parziale</option>
            <option value="paid">🟢 Pagato interamente</option>
          </select>
        </div>
        <div className="form-row form-row-2">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Importo totale (€)</label>
            <input
              type="number"
              step="0.01"
              placeholder="es. 150.00"
              value={editTotalAmount}
              onChange={(e) => setEditTotalAmount(e.target.value)}
            />
          </div>
          {(editStatus === "partial" || editStatus === "paid") && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{editStatus === "partial" ? "Importo parziale (€)" : "Importo saldato (€)"}</label>
              <input
                type="number"
                step="0.01"
                placeholder="es. 75.00"
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Metodo di pagamento</label>
          <select value={editMethod} onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Contanti</option>
            <option value="transfer">Bonifico</option>
            <option value="check">Assegno</option>
            <option value="other">Altro</option>
          </select>
        </div>
        <div className="form-group">
          <label>Note interne (Admin)</label>
          <textarea
            rows={2}
            placeholder="Note sul pagamento..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
        </div>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
