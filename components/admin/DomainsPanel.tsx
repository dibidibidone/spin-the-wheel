"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { DomainView } from "@/lib/domains";

export function DomainsPanel({ landingId, pollMs = 8000 }: { landingId: string; pollMs?: number }) {
  const [domains, setDomains] = useState<DomainView[]>([]);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/domains?landingId=${encodeURIComponent(landingId)}`);
    if (res.ok) setDomains((await res.json()).domains);
  }, [landingId]);

  useEffect(() => {
    load();
  }, [load]);

  const check = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/domains/${id}/verify`, { method: "POST" });
    if (res.ok) {
      const { domain } = await res.json();
      setDomains((list) => list.map((d) => (d.id === id ? domain : d)));
    }
  }, []);

  // Poll verification for still-pending domains (spec: CMS polls status).
  useEffect(() => {
    if (!pollMs) return;
    const pending = domains.filter((d) => !d.verified).map((d) => d.id);
    if (pending.length === 0) return;
    const timer = setInterval(() => pending.forEach((id) => check(id)), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, domains, check]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landingId, hostname }),
    });
    setBusy(false);
    if (res.ok) {
      const { domain } = await res.json();
      setHostname("");
      setDomains((list) => [...list, domain]);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add domain");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/domains/${id}`, { method: "DELETE" });
    if (res.ok) setDomains((list) => list.filter((d) => d.id !== id));
  }

  return (
    <div className="domains-panel">
      <form className="domains-add" onSubmit={add}>
        <input
          className="domains-input"
          placeholder="promo.yourcasino.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          aria-label="Domain to add"
        />
        <button className="btn" type="submit" disabled={busy || !hostname}>
          Add domain
        </button>
      </form>
      {error && (
        <p className="domains-error" role="alert">
          {error}
        </p>
      )}

      <ul className="domains-list">
        {domains.map((d) => (
          <li key={d.id} className="domains-item" data-testid="domain-row">
            <div className="domains-head">
              <span className="domains-host">{d.hostname}</span>
              <span className={d.verified ? "badge badge-ok" : "badge badge-pending"}>
                {d.verified ? "Verified" : "Pending"}
              </span>
            </div>
            {!d.verified && (
              <p className="domains-dns">
                Add a <strong>{d.dns.type}</strong> record — name <code>{d.dns.name}</code> → value{" "}
                <code>{d.dns.value}</code>
              </p>
            )}
            <div className="domains-actions">
              <button className="btn-sm" type="button" onClick={() => check(d.id)}>
                Check status
              </button>
              <button className="btn-sm btn-danger" type="button" onClick={() => remove(d.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
