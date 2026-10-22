"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/authService";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Email o password non corretti.");
      } else if (code === "auth/user-not-found") {
        setError("Nessun account trovato con questa email.");
      } else if (code === "auth/too-many-requests") {
        setError("Troppi tentativi. Riprova tra qualche minuto.");
      } else {
        setError("Si è verificato un errore. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a2e1e 0%, #0f1a11 100%)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: "var(--surface)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          padding: "40px 36px",
          border: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 16px",
            }}
          >
            🫒
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Oleificio Pro
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Accedi al tuo account
          </p>
        </div>

        {/* Form */}
        {!mounted ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 180 }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
          </div>
        ) : (
          <form
            suppressHydrationWarning
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Email
              </label>
              <input
                suppressHydrationWarning
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@oleificio.it"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-primary)",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Password
              </label>
              <input
                suppressHydrationWarning
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-primary)",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Errore */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  backgroundColor: "rgba(220,38,38,0.1)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  color: "#f87171",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "12px",
                borderRadius: 8,
                background: loading
                  ? "var(--border)"
                  : "linear-gradient(135deg, #5F9E74 0%, #3A6347 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                  Accesso in corso…
                </>
              ) : (
                "Accedi"
              )}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
