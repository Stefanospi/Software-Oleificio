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
  CreditCard,
  UserCog,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/authService";
import { subscribeToUnreadNotifications } from "@/lib/notificationService";

// ─── VOCI DI NAVIGAZIONE COMPLETA ─────────────────────────────────────────────
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/clienti", label: "Clienti", icon: Users, adminOnly: false },
  { href: "/bins", label: "Bins", icon: Box, adminOnly: false },
  { href: "/partite", label: "Partite", icon: ClipboardList, adminOnly: false },
  { href: "/contenitori", label: "Contenitori", icon: Container, adminOnly: false },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, adminOnly: false },
  { href: "/pagamenti", label: "Pagamenti", icon: CreditCard, adminOnly: true },
  { href: "/notifiche", label: "Notifiche", icon: Bell, adminOnly: true, hasBadge: true },
  { href: "/utenti", label: "Utenti", icon: UserCog, adminOnly: true },
];

// ─── VOCI RAPIDE PER LA BOTTOM BAR MOBILE (max 4 + tasto Menu) ────────────────
const mobileQuickItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/partite", label: "Partite", icon: ClipboardList },
  { href: "/bins", label: "Bins", icon: Box },
  { href: "/clienti", label: "Clienti", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeToUnreadNotifications((notifications) => {
      setUnreadCount(notifications.length);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Chiudi il drawer se cambia la pagina
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const initials = profile?.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  // Verifica se la rotta attiva è una rotta secondaria (non inclusa nei quick items)
  const isSecondaryActive =
    pathname !== "/" &&
    !mobileQuickItems.some(
      (q) => q.href !== "/" && pathname?.startsWith(q.href)
    );

  return (
    <>
      {/* ─── 1. TOP BAR MOBILE (< 768px) ─── */}
      <header className="mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Apri menu"
          >
            <Menu size={22} color="#E8F5EC" />
          </button>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🫒
            </div>
            <span
              style={{
                color: "#E8F5EC",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}
            >
              Oleificio Pro
            </span>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Badge ruolo compatto */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 9999,
              backgroundColor: isAdmin
                ? "rgba(74, 124, 89, 0.3)"
                : "rgba(29, 79, 156, 0.3)",
              color: isAdmin ? "#A8DDB8" : "#97BEF0",
              border: `1px solid ${
                isAdmin ? "rgba(74, 124, 89, 0.4)" : "rgba(29, 79, 156, 0.4)"
              }`,
            }}
          >
            {isAdmin ? <ShieldCheck size={11} /> : <Wrench size={11} />}
            {isAdmin ? "Admin" : "Dipendente"}
          </span>

          {/* Notifiche se admin */}
          {isAdmin && (
            <Link
              href="/notifiche"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 8,
                color: "rgba(255,255,255,0.75)",
                textDecoration: "none",
              }}
              aria-label="Notifiche"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: "9999px",
                    padding: "0 4px",
                    minWidth: 15,
                    height: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Avatar utente */}
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #5F9E74, #3A6347)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* ─── 2. DRAWER MOBILE COMPLETO (SLIDE-OVER) ─── */}
      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <div className={`mobile-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
              }}
            >
              🫒
            </div>
            <div>
              <div style={{ color: "#E8F5EC", fontWeight: 700, fontSize: 16 }}>
                Oleificio Pro
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {isAdmin ? "Pannello Amministratore" : "Pannello Dipendente"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Chiudi menu"
          >
            <X size={20} color="#E8F5EC" />
          </button>
        </div>

        {/* Profilo utente nel drawer */}
        {user && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #5F9E74, #3A6347)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: "#E8F5EC",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile?.displayName || user.email}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 1,
                }}
              >
                {isAdmin ? <ShieldCheck size={11} color="#A8DDB8" /> : <Wrench size={11} color="#97BEF0" />}
                <span>{isAdmin ? "Amministratore" : "Dipendente"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Lista completa di navigazione nel drawer */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "14px 10px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              padding: "4px 12px 8px",
            }}
          >
            Menu Principale
          </div>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              const badgeCount = item.hasBadge ? unreadCount : 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#A8DDB8" : "rgba(255,255,255,0.75)",
                      backgroundColor: isActive
                        ? "rgba(74,124,89,0.3)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(74,124,89,0.4)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{item.label}</span>

                    {badgeCount > 0 && (
                      <span
                        style={{
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 9999,
                          padding: "1px 6px",
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}

                    <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer del drawer con tasto Esci */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(0,0,0,0.15)",
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 16px",
              borderRadius: 10,
              border: "1px solid rgba(239, 68, 68, 0.4)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#fca5a5",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={16} />
            Esci dall&apos;applicazione
          </button>
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.25)",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Oleificio Pro · v2.0.0
          </div>
        </div>
      </div>

      {/* ─── 3. BOTTOM BAR MOBILE ERGONOMICA (5 TASTI) ─── */}
      <nav className="mobile-bottombar">
        {mobileQuickItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-tab ${isActive ? "active" : ""}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Tasto Menu / Altro che apre il drawer */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`mobile-tab ${drawerOpen || isSecondaryActive ? "active" : ""}`}
          aria-label="Altro menu"
        >
          <div style={{ position: "relative", display: "inline-flex" }}>
            <Menu size={20} strokeWidth={drawerOpen || isSecondaryActive ? 2.4 : 1.8} />
            {isAdmin && unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -5,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </div>
          <span>Menu</span>
        </button>
      </nav>

      {/* ─── 4. SIDEBAR DESKTOP FISSA (>= 768px) ─── */}
      <aside className="sidebar-container desktop-sidebar">
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
              <div
                style={{
                  color: "#E8F5EC",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.2,
                }}
              >
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
          style={{
            margin: "0 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        />

        {/* Profilo utente desktop */}
        {user && (
          <div style={{ padding: "12px 18px 4px" }}>
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
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
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

        {/* Lista navigazione desktop */}
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
            style={{ listStyle: "none", display: "flex", flexDirection: "column" }}
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
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
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className="sidebar-nav-label" style={{ flex: 1 }}>
                      {item.label}
                    </span>

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

        {/* Footer desktop con logout */}
        <div
          className="sidebar-footer"
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
    </>
  );
}
