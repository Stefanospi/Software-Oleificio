"use client";

import { useEffect, useState } from "react";
import {
  UserCog,
  Plus,
  ShieldCheck,
  Wrench,
  Trash2,
  Loader2,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import {
  getUserProfile,
  createUserProfile,
  createAccountWithSecondaryAuth,
  updateUserRole,
  deleteUserProfile,
} from "@/lib/authService";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile, UserRole } from "@/types";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UtentiPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmUid, setDeleteConfirmUid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("dipendente");
  const [formError, setFormError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => d.data() as UserProfile);
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(list);
    } catch (e) {
      console.error("Errore caricamento utenti:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreateUser = async () => {
    setFormError(null);
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError("Tutti i campi sono obbligatori.");
      return;
    }
    if (formPassword.length < 6) {
      setFormError("La password deve essere di almeno 6 caratteri.");
      return;
    }
    setSaving(true);
    try {
      // Crea account Firebase Auth usando l'istanza secondaria → NON slogga l'admin
      const uid = await createAccountWithSecondaryAuth(
        formEmail.trim(),
        formPassword.trim()
      );

      // Crea il documento Firestore con il profilo
      await createUserProfile(uid, formEmail.trim(), formName.trim(), formRole);

      setShowModal(false);
      resetForm();
      await loadUsers();
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setFormError("Questa email è già associata a un account.");
      } else if (code === "auth/invalid-email") {
        setFormError("Indirizzo email non valido.");
      } else if (code === "auth/weak-password") {
        setFormError("Password troppo debole (min. 6 caratteri).");
      } else {
        setFormError("Errore durante la creazione: " + (err?.message ?? code));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    await updateUserRole(uid, newRole);
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
  };

  const handleDeleteUser = async (uid: string) => {
    setDeleting(true);
    try {
      // Rimuove il documento Firestore → l'utente perderà accesso al sistema
      // (l'account Auth rimane ma senza profilo non potrà operare)
      await deleteUserProfile(uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setDeleteConfirmUid(null);
    } catch (e) {
      console.error("Errore eliminazione utente:", e);
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("dipendente");
    setFormError(null);
    setShowPassword(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div className="flex-between-responsive" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            Gestione Utenti
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            Crea e gestisci gli account per il personale dell&apos;oleificio
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <Plus size={17} />
          Nuovo Utente
        </button>
      </div>

      {/* Lista utenti */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
            <Loader2 size={26} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <UserCog size={40} style={{ margin: "0 auto 12px", opacity: 0.4, display: "block" }} />
            <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>Nessun utente trovato</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Crea il primo account dipendente.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Email</th>
                  <th>Ruolo</th>
                  <th style={{ textAlign: "right" }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrentUser = u.uid === currentUser?.uid;
                  return (
                    <tr key={u.uid}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: u.role === "admin"
                                ? "linear-gradient(135deg, #5F9E74, #3A6347)"
                                : "linear-gradient(135deg, #6B7280, #4B5563)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {u.role === "admin"
                              ? <ShieldCheck size={16} color="#fff" />
                              : <Wrench size={16} color="#fff" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {u.displayName}
                              {isCurrentUser && (
                                <span style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "var(--accent-light)",
                                  color: "var(--accent)",
                                }}>
                                  TU
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                          <Mail size={13} />
                          {u.email}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${u.role === "admin" ? "badge-green" : "badge-blue"}`}
                        >
                          {u.role === "admin" ? <ShieldCheck size={12} /> : <Wrench size={12} />}
                          {u.role === "admin" ? "Amministratore" : "Dipendente"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                          {/* Cambio ruolo — non su se stessi */}
                          {!isCurrentUser && (
                            u.role === "dipendente" ? (
                              <button
                                className="btn-ghost"
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => handleChangeRole(u.uid, "admin")}
                              >
                                <ShieldCheck size={13} />
                                Promuovi Admin
                              </button>
                            ) : (
                              <button
                                className="btn-secondary"
                                style={{ padding: "6px 12px", fontSize: 12 }}
                                onClick={() => handleChangeRole(u.uid, "dipendente")}
                              >
                                <Wrench size={13} />
                                Imposta Dipendente
                              </button>
                            )
                          )}

                          {/* Elimina — non su se stessi */}
                          {!isCurrentUser && (
                            deleteConfirmUid === u.uid ? (
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "var(--red-text)", whiteSpace: "nowrap" }}>
                                  Confermi?
                                </span>
                                <button
                                  className="btn-danger"
                                  style={{ padding: "6px 10px", fontSize: 12 }}
                                  onClick={() => handleDeleteUser(u.uid)}
                                  disabled={deleting}
                                >
                                  {deleting
                                    ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                                    : "Sì, elimina"}
                                </button>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: "6px 10px", fontSize: 12 }}
                                  onClick={() => setDeleteConfirmUid(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn-danger"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                                onClick={() => setDeleteConfirmUid(u.uid)}
                                title="Rimuovi utente dal sistema"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
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

      {/* Avviso */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 10,
          background: "var(--blue-bg)",
          border: "1px solid var(--blue-border)",
          fontSize: 13,
          color: "var(--blue-text)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Come funziona:</strong> Creando un nuovo account, l&apos;admin rimane loggato. Il dipendente potrà accedere subito con le credenziali fornite.
          Eliminare un utente rimuove il suo accesso al sistema (il profilo viene disattivato).
        </span>
      </div>

      {/* Modal Nuovo Utente */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Crea Nuovo Account"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annulla</button>
            <button className="btn-primary" onClick={handleCreateUser} disabled={saving}>
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Crea Account
            </button>
          </>
        }
      >
        {formError && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--red-bg)",
              border: "1px solid var(--red-border)",
              color: "var(--red-text)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {formError}
          </div>
        )}
        <div className="form-group">
          <label>Nome e Cognome *</label>
          <input
            type="text"
            placeholder="Es. Mario Rossi"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            placeholder="Es. mario.rossi@oleificio.it"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Password *</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Minimo 6 caratteri"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Ruolo</label>
          <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)}>
            <option value="dipendente">Dipendente</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>* Campi obbligatori</p>
      </Modal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
