"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Scale,
  UserPlus,
  CreditCard,
  Cog,
} from "lucide-react";
import {
  getAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/notificationService";
import type { Notification, NotificationType } from "@/types";

export default function NotifichePage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getAllNotifications(100);
      setNotifications(list);
    } catch (err) {
      console.error("Errore caricamento notifiche:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = async (id?: string) => {
    if (!id) return;
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "new_batch":
        return <Layers size={18} color="#5F9E74" />;
      case "new_weighing":
        return <Scale size={18} color="#D97706" />;
      case "new_customer":
        return <UserPlus size={18} color="#2563EB" />;
      case "payment_update":
        return <CreditCard size={18} color="#16A34A" />;
      case "milling_update":
        return <Cog size={18} color="#9333EA" />;
      default:
        return <Bell size={18} color="#5F9E74" />;
    }
  };

  const formatTimestamp = (createdAt: any) => {
    if (!createdAt) return "";
    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      return date.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Centro Notifiche
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  background: "#DC2626",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {unreadCount} nuove
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            Monitora le attività e gli aggiornamenti inviati in tempo reale dai dispositivi mobili.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <CheckCheck size={16} color="var(--accent)" />
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* Filtri */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 12,
        }}
      >
        {(
          [
            { key: "all", label: `Tutte (${notifications.length})` },
            { key: "unread", label: `Non lette (${unreadCount})` },
            { key: "read", label: `Lette (${notifications.length - unreadCount})` },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: filter === item.key ? "var(--accent)" : "transparent",
              color: filter === item.key ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Lista Notifiche */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
          Caricamento notifiche in corso...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "var(--surface)",
            borderRadius: 16,
            border: "1px solid var(--border)",
          }}
        >
          <Bell size={40} style={{ color: "var(--text-muted)", marginBottom: 16, opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
            Nessuna notifica presente
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            {filter === "unread"
              ? "Non ci sono nuove notifiche da leggere."
              : "Le notifiche delle azioni svolte dal personale compariranno qui."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "16px 20px",
                borderRadius: 12,
                background: item.isRead ? "var(--surface)" : "var(--accent-light, rgba(95, 158, 116, 0.08))",
                border: `1px solid ${item.isRead ? "var(--border)" : "var(--accent)"}`,
                transition: "all 0.2s ease",
              }}
            >
              {/* Icona Tipo */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {getTypeIcon(item.type)}
              </div>

              {/* Contenuto */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.title}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 12 }}>
                    <Clock size={13} />
                    <span>{formatTimestamp(item.createdAt)}</span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                  {item.body}
                </p>

                {item.createdByName && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    Operatore: <strong style={{ color: "var(--text-primary)" }}>{item.createdByName}</strong>
                  </div>
                )}
              </div>

              {/* Azioni */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {!item.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    title="Segna come letta"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent)",
                      cursor: "pointer",
                      padding: 6,
                      borderRadius: 6,
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  title="Elimina notifica"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
