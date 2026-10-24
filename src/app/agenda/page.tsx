"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Scale,
  FileText,
  Trash2,
} from "lucide-react";
import {
  subscribeAppointments,
  addAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "@/lib/agendaService";
import { subscribeCustomers } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";
import { CustomerSelect } from "@/components/CustomerSelect";
import type { Appointment, AppointmentStatus, AppointmentType, Customer } from "@/types";
import { Timestamp } from "firebase/firestore";

// Data locale in formato YYYY-MM-DD (toISOString userebbe UTC e sfaserebbe il giorno)
const toLocalDateStr = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Interpreta YYYY-MM-DD come data locale
const parseLocalDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export default function AgendaPage() {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state per nuovo appuntamento
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formType, setFormType] = useState<AppointmentType>("conferimento");
  const [formTime, setFormTime] = useState("09:00");
  const [formEstimatedKg, setFormEstimatedKg] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubAppts = subscribeAppointments(
      (list) => { setAppointments(list); setLoading(false); setError(null); },
      (err) => { setLoading(false); setError(`Impossibile caricare l'agenda: ${err.message}`); }
    );
    const unsubCustomers = subscribeCustomers(setCustomers);
    return () => { unsubAppts(); unsubCustomers(); };
  }, []);

  // Filtra appuntamenti per la data selezionata (YYYY-MM-DD)
  const currentDayAppointments = appointments.filter((a) => {
    if (!a.startDate) return false;
    try {
      const d = a.startDate.toDate ? a.startDate.toDate() : new Date(a.startDate as any);
      return toLocalDateStr(d) === selectedDate;
    } catch {
      return false;
    }
  });

  const changeDateBy = (days: number) => {
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(toLocalDateStr(current));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) return;
    const selectedCustomer = customers.find((c) => c.id === formCustomerId);
    if (!selectedCustomer) return;

    try {
      setSaving(true);
      setError(null);
      const [hours, minutes] = formTime.split(":").map(Number);
      const start = parseLocalDate(selectedDate);
      start.setHours(Number.isNaN(hours) ? 9 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);

      const end = new Date(start.getTime() + 60 * 60 * 1000);

      await addAppointment({
        customerId: selectedCustomer.id!,
        customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
        title: `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${formType}`,
        type: formType,
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        status: "scheduled",
        estimatedOlivesKg: formEstimatedKg ? Number(formEstimatedKg) : undefined,
        notes: formNotes || undefined,
        createdBy: user?.uid ?? "system",
      });

      setShowModal(false);
      setFormCustomerId("");
      setFormEstimatedKg("");
      setFormNotes("");
    } catch (err) {
      console.error("Errore creazione appuntamento:", err);
      setError(`Errore durante il salvataggio dell'appuntamento: ${err instanceof Error ? err.message : "riprova"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id?: string, status?: AppointmentStatus) => {
    if (!id || !status) return;
    try {
      setError(null);
      await updateAppointmentStatus(id, status);
    } catch (err) {
      console.error("Errore aggiornamento stato:", err);
      setError("Impossibile aggiornare lo stato dell'appuntamento.");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("Sei sicuro di voler eliminare questo appuntamento?")) return;
    try {
      setError(null);
      await deleteAppointment(id);
    } catch (err) {
      console.error("Errore eliminazione appuntamento:", err);
      setError("Impossibile eliminare l'appuntamento.");
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "completed":
        return { label: "Completato", bg: "#DCFCE7", text: "#15803D" };
      case "in_progress":
        return { label: "In corso", bg: "#FEF3C7", text: "#B45309" };
      case "cancelled":
        return { label: "Annullato", bg: "#FEE2E2", text: "#B91C1C" };
      default:
        return { label: "Programmato", bg: "#E0E7FF", text: "#4338CA" };
    }
  };

  const getTypeLabel = (type: AppointmentType) => {
    switch (type) {
      case "conferimento":
        return "🫒 Conferimento Olive";
      case "molitura":
        return "⚙️ Molitura";
      case "ritiro":
        return "🛢️ Ritiro Olio";
      default:
        return "📅 Altro";
    }
  };

  const isToday = selectedDate === toLocalDateStr(new Date());

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Agenda Oleificio
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Pianifica conferimenti, monitora le presenze dei giorni precedenti e gestisci i tempi.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(95, 158, 116, 0.3)",
          }}
        >
          <Plus size={16} />
          Nuovo Appuntamento
        </button>
      </div>

      {/* Date Navigator Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => changeDateBy(-1)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-app)",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: 14,
            }}
          />

          <button
            onClick={() => changeDateBy(1)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <ChevronRight size={18} />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(toLocalDateStr(new Date()))}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: 4,
              }}
            >
              Torna a oggi
            </button>
          )}
        </div>

        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Clienti attesi in questa data:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {currentDayAppointments.length}
          </strong>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#FEE2E2", color: "#B91C1C", fontSize: 13, border: "1px solid #FCA5A5" }}>
          {error}
        </div>
      )}

      {/* Lista Appuntamenti del Giorno */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          Caricamento appuntamenti...
        </div>
      ) : currentDayAppointments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "var(--surface)",
            borderRadius: 16,
            border: "1px solid var(--border)",
          }}
        >
          <CalendarIcon size={40} style={{ color: "var(--text-muted)", marginBottom: 16, opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Nessun cliente registrato per questa data
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Puoi aggiungere un conferimento o un appuntamento cliccando su &quot;Nuovo Appuntamento&quot;.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {currentDayAppointments.map((item) => {
            const badge = getStatusBadge(item.status);
            const timeFormatted = item.startDate?.toDate
              ? item.startDate.toDate().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
              : "";

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  borderRadius: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                {/* Orario e info base */}
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--accent)",
                      minWidth: 70,
                    }}
                  >
                    <Clock size={16} />
                    <span>{timeFormatted || "--:--"}</span>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.customerName}
                      </h4>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginTop: 4,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{getTypeLabel(item.type)}</span>
                      {item.estimatedOlivesKg && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Scale size={14} color="var(--text-muted)" />
                          {item.estimatedOlivesKg} kg previsti
                        </span>
                      )}
                      {item.notes && (
                        <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
                          &ldquo;{item.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pulsanti Cambio Stato */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.status !== "completed" && (
                    <button
                      onClick={() => handleStatusChange(item.id, "completed")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "1px solid #16A34A",
                        background: "#DCFCE7",
                        color: "#15803D",
                        cursor: "pointer",
                      }}
                    >
                      Completa
                    </button>
                  )}
                  {item.status === "scheduled" && (
                    <button
                      onClick={() => handleStatusChange(item.id, "in_progress")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "1px solid #D97706",
                        background: "#FEF3C7",
                        color: "#B45309",
                        cursor: "pointer",
                      }}
                    >
                      In corso
                    </button>
                  )}
                  {isAdmin && <button
                    onClick={() => handleDelete(item.id)}
                    title="Elimina"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 6,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuovo Appuntamento */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: 28,
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>
              Nuovo Appuntamento / Conferimento
            </h3>

            <form onSubmit={handleCreateAppointment}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Seleziona Cliente */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                    Cliente *
                  </label>
                  <CustomerSelect customers={customers} value={formCustomerId} onChange={setFormCustomerId} />
                </div>

                {/* Tipo e Orario */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                      Attività
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as AppointmentType)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-app)",
                        color: "var(--text-primary)",
                        fontSize: 14,
                      }}
                    >
                      <option value="conferimento">Conferimento Olive</option>
                      <option value="molitura">Molitura</option>
                      <option value="ritiro">Ritiro Olio</option>
                      <option value="altro">Altro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                      Orario
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-app)",
                        color: "var(--text-primary)",
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>

                {/* Kg Previsti */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                    Kg di olive stimati (opzionale)
                  </label>
                  <input
                    type="number"
                    value={formEstimatedKg}
                    onChange={(e) => setFormEstimatedKg(e.target.value)}
                    placeholder="es. 1200"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-app)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Note */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>
                    Note interne
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    placeholder="es. Richiede bins aggiuntivi, preferenza macina..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-app)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                    }}
                  />
                </div>

                {/* Azioni modal */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formCustomerId}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
                      color: "#fff",
                      border: "none",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Salvataggio..." : "Salva in Agenda"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
