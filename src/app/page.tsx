"use client";

import { Users, Box, ClipboardList, Droplets, Loader2, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { subscribeCustomers, subscribeBins, subscribeBatches, subscribeContainers, subscribeWeighings } from "@/lib/db";
import { subscribeAppointments } from "@/lib/agendaService";
import { useAuth } from "@/context/AuthContext";
import type { Customer, Bin, Batch, Container, Weighing, Appointment } from "@/types";

export default function Home() {
  const { loading: authLoading, user, profile } = useAuth();
  const [stats, setStats] = useState({
    clienti: 0,
    binsUsati: 0,
    binsTotali: 0,
    partiteAperte: 0,
    olioProdotto: 0
  });
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Attende utente e profilo prima di aprire le sottoscrizioni Firestore
    if (authLoading || !user || !profile) return;

    type Data = { clienti: Customer[]; bins: Bin[]; partite: Batch[]; contenitori: Container[] };
    const data: Partial<Data> = {};
    const recompute = () => {
      const { clienti, bins, partite, contenitori } = data;
      if (!clienti || !bins || !partite || !contenitori) return;
      setStats({
        clienti: clienti.length,
        binsUsati: bins.filter(b => b.status !== "AVAILABLE").length,
        binsTotali: bins.length,
        partiteAperte: partite.filter(p => p.status === "OPEN").length,
        olioProdotto: contenitori.reduce((acc, curr) => acc + curr.currentLiters, 0),
      });
      setLoading(false);
    };
    const onError = () => setLoading(false);

    const unsubs = [
      subscribeCustomers((v) => { data.clienti = v; setCustomers(v); recompute(); }, onError),
      subscribeBins((v) => { data.bins = v; recompute(); }, onError),
      subscribeBatches((v) => { data.partite = v; setBatches(v); recompute(); }, onError),
      subscribeWeighings(setWeighings),
      subscribeAppointments(setAppointments),
      subscribeContainers((v) => { data.contenitori = v; recompute(); }, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authLoading, user, profile]);

  const openBatches = useMemo(() => {
    const names = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    const kgByBatch = new Map<string, { kg: number; bins: Set<string> }>();
    weighings.forEach((w) => {
      const e = kgByBatch.get(w.batchId) ?? { kg: 0, bins: new Set<string>() };
      e.kg += w.weightKg ?? 0;
      (w.binIds ?? (w.binId ? [w.binId] : [])).forEach((b) => e.bins.add(b));
      kgByBatch.set(w.batchId, e);
    });
    return batches
      .filter((b) => b.status === "OPEN")
      .map((b) => ({
        id: b.id!,
        name: names.get(b.customerId) ?? "Cliente sconosciuto",
        kg: kgByBatch.get(b.id!)?.kg ?? 0,
        bins: kgByBatch.get(b.id!)?.bins.size ?? 0,
      }));
  }, [customers, batches, weighings]);

  const todayAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => {
        const d = a.startDate?.toDate?.();
        return d && d.toDateString() === now.toDateString() && a.status !== "completed" && a.status !== "cancelled";
      })
      .slice(0, 8);
  }, [appointments]);

  const statCards = [
    {
      label: "Clienti Totali",
      value: stats.clienti.toString(),
      sub: "clienti registrati",
      icon: Users,
      color: "#1D4F9C",
      bgColor: "#EEF4FD",
      borderColor: "#97BEF0",
      href: "/clienti"
    },
    {
      label: "Bins in Uso",
      value: `${stats.binsUsati}`,
      sub: `di ${stats.binsTotali} totali`,
      icon: Box,
      color: "#8B4513",
      bgColor: "#FEF3EC",
      borderColor: "#F3B98A",
      href: "/bins"
    },
    {
      label: "Partite Aperte",
      value: stats.partiteAperte.toString(),
      sub: "in lavorazione",
      icon: ClipboardList,
      color: "#1E6B3E",
      bgColor: "#EDFAF2",
      borderColor: "#A3DDBA",
      href: "/partite"
    },
    {
      label: "Olio in Stoccaggio",
      value: `${stats.olioProdotto}`,
      sub: "litri nei contenitori",
      icon: Droplets,
      color: "#7A5A00",
      bgColor: "#FEF9EC",
      borderColor: "#F4D86A",
      href: "/contenitori"
    },
  ];

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Panoramica generale delle attività dell&apos;oleificio
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="responsive-grid-4" style={{ marginBottom: 28 }}>
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={idx}
                  href={stat.href}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="card"
                    style={{
                      padding: "20px 20px",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        backgroundColor: stat.bgColor,
                        border: `1px solid ${stat.borderColor}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Icon size={20} color={stat.color} />
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                    <div className="card-stat-value" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {stat.sub}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Operativo in tempo reale */}
          <div className="responsive-grid-2" style={{ marginBottom: 28 }}>
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                Partite in lavorazione ({openBatches.length})
              </h2>
              {openBatches.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nessuna partita aperta.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {openBatches.slice(0, 10).map((b) => (
                    <Link key={b.id} href="/partite" style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--surface)", fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.name}</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {b.kg > 0 ? `${b.kg.toLocaleString("it-IT")} kg` : "peso n/d"} · {b.bins} bins
                        </span>
                      </div>
                    </Link>
                  ))}
                  {openBatches.length > 10 && (
                    <Link href="/partite" style={{ fontSize: 12, color: "var(--accent)" }}>Vedi tutte ({openBatches.length})</Link>
                  )}
                </div>
              )}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                Appuntamenti di oggi ({todayAppointments.length})
              </h2>
              {todayAppointments.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Nessun appuntamento in programma oggi.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {todayAppointments.map((a) => (
                    <Link key={a.id} href="/agenda" style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--surface)", fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.customerName ?? a.title}</span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {a.startDate.toDate().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Quick links */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <TrendingUp size={18} color="var(--accent)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Accesso Rapido
              </h2>
            </div>
            <div className="responsive-grid-4">
              {[
                { label: "➕ Nuovo Cliente", href: "/clienti?nuovo=1" },
                { label: "📦 Gestisci Bins", href: "/bins" },
                { label: "⚖️ Nuova Partita", href: "/partite?nuova=1" },
                { label: "🛢️ Vedi Contenitori", href: "/contenitori" },
              ].map((q) => (
                <Link key={q.href} href={q.href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border)",
                      backgroundColor: "var(--surface)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)";
                      (e.currentTarget as HTMLDivElement).style.color = "var(--accent)";
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--accent-light)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLDivElement).style.color = "var(--text-secondary)";
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--surface)";
                    }}
                  >
                    {q.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
