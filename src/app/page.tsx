"use client";

import { Users, Box, ClipboardList, Droplets, Loader2, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCustomers, getBins, getBatches, getContainers } from "@/lib/db";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { loading: authLoading, user } = useAuth();
  const [stats, setStats] = useState({
    clienti: 0,
    binsUsati: 0,
    binsTotali: 0,
    partiteAperte: 0,
    olioProdotto: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aspettiamo che l'utente sia autenticato prima di fare query Firestore
    if (authLoading || !user) return;
    async function loadStats() {
      try {
        const [clienti, bins, partite, contenitori] = await Promise.all([
          getCustomers(),
          getBins(),
          getBatches(),
          getContainers()
        ]);

        const binsUsati = bins.filter(b => b.status !== "AVAILABLE").length;
        const partiteAperte = partite.filter(p => p.status === "OPEN").length;
        const olioProdotto = contenitori.reduce((acc, curr) => acc + curr.currentLiters, 0);

        setStats({
          clienti: clienti.length,
          binsUsati,
          binsTotali: bins.length,
          partiteAperte,
          olioProdotto
        });
      } catch (error) {
        console.error("Errore nel caricamento delle statistiche", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [authLoading, user]);

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
                { label: "➕ Nuovo Cliente", href: "/clienti" },
                { label: "📦 Gestisci Bins", href: "/bins" },
                { label: "⚖️ Nuova Partita", href: "/partite" },
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
