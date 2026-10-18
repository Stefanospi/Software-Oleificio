"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Box,
  ClipboardList,
  Container,
  CalendarDays,
  Bell,
  LogOut,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/authService";
import { subscribeToUnreadNotifications } from "@/lib/notificationService";

// ─── VOCI DI NAVIGAZIONE ──────────────────────────────────────────────────────
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/clienti", label: "Clienti", icon: Users, adminOnly: false },
  { href: "/bins", label: "Gestione Bins", icon: Box, adminOnly: false },
  { href: "/partite", label: "Partite e Pesate", icon: ClipboardList, adminOnly: false },
  { href: "/contenitori", label: "Contenitori Olio", icon: Container, adminOnly: false },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, adminOnly: false },
  { href: "/notifiche", label: "Notifiche", icon: Bell, adminOnly: true, hasBadge: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Abbonamento real-time alle notifiche non lette (solo Admin)
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToUnreadNotifications((notifications) => {
      setUnreadCount(notifications.length);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="sidebar-container">
      {/* Logo */}
      <div className="sidebar-logo-area" style={{ padding: "28px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🫒
          </div>
          <div>
            <div style={{ color: "#E8F5EC", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Oleificio Pro
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              {isAdmin ? "Pannello Admin" : "Pannello Dipendente"}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        className="sidebar-logo-area"
        style={{ margin: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      />

      {/* Profilo utente */}
      {user && (
        <div style={{ padding: "12px 20px 4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #5F9E74, #3A6347)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isAdmin ? (
                <ShieldCheck size={14} color="#fff" />
              ) : (
                <Wrench size={14} color="#fff" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile?.displayName ?? user.email}
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>
                {isAdmin ? "Amministratore" : "Dipendente"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        className="sidebar-nav-area"
        style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}
      >
        <div
          className="sidebar-nav-menu-title"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.25)",
            textTransform: "uppercase",
            padding: "8px 10px 6px",
          }}
        >
          Menu
        </div>
        <ul
          className="sidebar-nav-list"
          style={{ listStyle: "none", display: "flex" }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const badgeCount = item.hasBadge ? unreadCount : 0;

            return (
              <li
                key={item.href}
                className="sidebar-nav-item"
                style={{ marginBottom: 2 }}
              >
                <Link
                  href={item.href}
                  className="sidebar-nav-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#A8DDB8" : "rgba(255,255,255,0.6)",
                    backgroundColor: isActive
                      ? "rgba(74,124,89,0.25)"
                      : "transparent",
                    transition: "all 0.15s ease",
                    border: isActive
                      ? "1px solid rgba(74,124,89,0.3)"
                      : "1px solid transparent",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "rgba(255,255,255,0.9)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                        "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color =
                        "rgba(255,255,255,0.6)";
                    }
                  }}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span style={{ flex: 1 }}>{item.label}</span>

                  {/* Badge notifiche */}
                  {badgeCount > 0 && (
                    <span
                      style={{
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: "9999px",
                        padding: "1px 6px",
                        minWidth: 18,
                        textAlign: "center",
                        lineHeight: "16px",
                      }}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer + Logout */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "transparent",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(239,68,68,0.15)";
            (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(239,68,68,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.45)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.08)";
          }}
        >
          <LogOut size={15} />
          Esci
        </button>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.18)",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          v2.0.0 · Oleificio Pro
        </div>
      </div>
    </aside>
  );
}
