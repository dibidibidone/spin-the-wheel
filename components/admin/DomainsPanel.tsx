"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { DomainView } from "@/lib/domains";
import { suggestDomains, buyDomain, rotateDomain, flagDomain, retryDomain } from "@/lib/adminClient";

type Candidate = { name: string; available: boolean; priceUsd: number };
type ProvisionedStatus = { hostname: string; status: string };

export function DomainsPanel({ landingId, pollMs = 8000 }: { landingId: string; pollMs?: number }) {
  const [domains, setDomains] = useState<DomainView[]>([]);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Provisioning (suggest + buy) state
  const [keyword, setKeyword] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [provisionedStatuses, setProvisionedStatuses] = useState<ProvisionedStatus[]>([]);

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

  async function handleSuggest() {
    if (!keyword.trim()) return;
    setSuggestError(null);
    setSuggestBusy(true);
    setCandidates([]);
    try {
      const result = await suggestDomains(keyword.trim());
      setCandidates(result.candidates);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Suggest failed");
    } finally {
      setSuggestBusy(false);
    }
  }

  async function handleBuy(name: string) {
    setSuggestError(null);
    try {
      const result = await buyDomain(landingId, name);
      setProvisionedStatuses((prev) => [...prev, { hostname: name, status: result.status }]);
      setCandidates((prev) => prev.filter((c) => c.name !== name));
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Buy failed");
    }
  }

  async function handleRotate(d: DomainView) {
    const newHostname = window.prompt("Enter new hostname to rotate to:");
    if (!newHostname) return;
    try {
      await rotateDomain(landingId, newHostname.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotate failed");
    }
  }

  async function handleFlag(d: DomainView) {
    try {
      await flagDomain(d.id, "manual");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag failed");
    }
  }

  async function handleRetry(d: DomainView) {
    try {
      await retryDomain(d.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }

  return (
    <div className="domains-panel">
      {/* Provisioning: keyword suggest + buy */}
      <div className="domains-provision">
        <div className="domains-suggest-row">
          <input
            className="domains-input"
            placeholder="Brand or keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="Brand or keyword"
          />
          <button
            className="btn"
            type="button"
            onClick={handleSuggest}
            disabled={suggestBusy || !keyword.trim()}
          >
            Search
          </button>
        </div>
        {suggestError && (
          <p className="domains-error" role="alert">
            {suggestError}
          </p>
        )}
        {candidates.length > 0 && (
          <ul className="domains-candidates">
            {candidates.filter((c) => c.available).map((c) => (
              <li key={c.name} className="domains-candidate">
                <span className="domains-candidate-name">{c.name}</span>
                <span className="domains-candidate-price">${c.priceUsd}/yr</span>
                <button
                  className="btn-sm"
                  type="button"
                  onClick={() => handleBuy(c.name)}
                >
                  Buy &amp; provision {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {provisionedStatuses.length > 0 && (
          <ul className="domains-provisioned">
            {provisionedStatuses.map((p) => (
              <li key={p.hostname} className="domains-provisioned-item">
                <span className="domains-host">{p.hostname}</span>
                <span className="badge">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manual attach escape hatch */}
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
              {"status" in d && d.status && (
                <span className="badge badge-status">{d.status}</span>
              )}
            </div>
            {"statusReason" in d && d.statusReason && (
              <p className="domains-reason">{d.statusReason}</p>
            )}
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
              <button className="btn-sm" type="button" onClick={() => handleRotate(d)}>
                Rotate
              </button>
              <button className="btn-sm" type="button" onClick={() => handleFlag(d)}>
                Mark flagged
              </button>
              <button className="btn-sm" type="button" onClick={() => handleRetry(d)}>
                Retry
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
