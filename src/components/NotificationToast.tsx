"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Layers, Scale, UserPlus, CreditCard, Cog, ExternalLink } from "lucide-react";
import { subscribeToAllNotifications } from "@/lib/notificationService";
import { playNotificationChime } from "@/lib/soundService";
import type { Notification, NotificationType } from "@/types";

export function NotificationToast() {
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const isInitialMount = useRef(true);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sottoscrizione alle notifiche real-time
    const unsubscribe = subscribeToAllNotifications((notifications) => {
      // Al primo mount registriamo gli ID esistenti per non notificare lo storico precedente
      if (isInitialMount.current) {
        notifications.forEach((n) => {
          if (n.id) knownNotificationIds.current.add(n.id);
        });
        isInitialMount.current = false;
        return;
      }

      // Cerca la prima nuova notifica non ancora vista
      const newNotification = notifications.find(
        (n) => n.id && !knownNotificationIds.current.has(n.id)
      );

      // Aggiorna l'insieme degli ID conosciuti
      notifications.forEach((n) => {
        if (n.id) knownNotificationIds.current.add(n.id);
      });

      if (newNotification) {
        // Riproduce il suono acustico
        playNotificationChime();

        // Mostra il toast pop-up
        setActiveToast(newNotification);

        // Auto-dismiss dopo 6 secondi
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 6000);
      }
    }, 20);

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!activeToast) return null;

  const getIcon = (type?: NotificationType) => {
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
        return <Bell size={18} color="var(--accent)" />;
    }
  };

  const handleClickToast = () => {
    setActiveToast(null);
    router.push("/notifiche");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 380,
        width: "calc(100vw - 40px)",
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.15)",
        overflow: "hidden",
        animation: "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Barra colorata in testata */}
      <div style={{ height: 3, background: "var(--accent)" }} />

      <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {getIcon(activeToast.type)}
        </div>

        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={handleClickToast}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {activeToast.title}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>Adesso</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.35 }}>
            {activeToast.body}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
            <span>Apri notifiche</span>
            <ExternalLink size={10} />
          </div>
        </div>

        <button
          onClick={() => setActiveToast(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
          title="Chiudi notifica"
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
