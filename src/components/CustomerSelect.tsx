"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { Customer } from "@/types";

interface Props {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  allowEmpty?: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const customerLabel = (c: Customer) =>
  `${c.firstName} ${c.lastName}${c.companyName ? ` (${c.companyName})` : ""}`;

// Ricerca incrementale: ogni parola digitata deve comparire in nome, cognome, azienda, telefono o CF
export function CustomerSelect({ customers, value, onChange, placeholder = "Cerca cliente per nome, cognome, telefono...", autoFocus, allowEmpty }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = customers.find((c) => c.id === value);

  const results = useMemo(() => {
    const words = norm(text).split(/\s+/).filter(Boolean);
    const sorted = [...customers].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it", { sensitivity: "base" })
    );
    if (words.length === 0) return sorted.slice(0, 50);
    return sorted
      .filter((c) => {
        const hay = norm(`${c.firstName} ${c.lastName} ${c.firstName} ${c.companyName ?? ""} ${c.phone ?? ""} ${c.fiscalCode ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 50);
  }, [customers, text]);

  useEffect(() => {
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (id: string) => {
    onChange(id);
    setText("");
    setOpen(false);
  };

  if (selected && !open) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", background: "var(--accent-light)" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{customerLabel(selected)}</span>
        <button
          type="button"
          onClick={() => { if (allowEmpty) onChange(""); setOpen(true); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
        >
          <X size={13} /> Cambia
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          type="text"
          value={text}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); const c = results[active]; if (c?.id) pick(c.id); }
          }}
          style={{ paddingLeft: 36 }}
        />
      </div>
      <div
        ref={listRef}
        style={{ marginTop: 6, maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--background, #fff)" }}
      >
        {results.length === 0 ? (
          <div style={{ padding: 10, fontSize: 13, color: "var(--text-muted)" }}>Nessun cliente trovato.</div>
        ) : results.map((c, i) => (
          <div
            key={c.id}
            onMouseDown={(e) => { e.preventDefault(); pick(c.id!); }}
            onMouseEnter={() => setActive(i)}
            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 14, background: i === active ? "var(--accent-light)" : "transparent", display: "flex", justifyContent: "space-between", gap: 10 }}
          >
            <span style={{ fontWeight: 600 }}>{customerLabel(c)}</span>
            {c.phone && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.phone}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
