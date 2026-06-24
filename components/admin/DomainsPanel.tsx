"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { DomainView } from "@/lib/domains";
import { suggestDomains, buyDomain, rotateDomain, flagDomain, retryDomain } from "@/lib/adminClient";

type Candidate = { name: string; available: boolean; priceUsd: number };
type BoughtStatus = { name: string; status: string };

export function DomainsPanel({ landingId, pollMs = 8000 }: { landingId: string; pollMs?: number }) {
  const [domains, setDomains] = useState<DomainView[]>([]);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Provisioning section state
  const [keyword, setKeyword] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [boughtStatuses, setBoughtStatuses] = useState<BoughtStatus[]>([]);

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

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setCandidates([]);
    setSearchBusy(true);
    try {
      const result = await suggestDomains(keyword);
      setCandidates(result.candidates);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchBusy(false);
    }
  }

  async function handleBuy(name: string) {
    setSearchError(null);
    try {
      const result = await buyDomain(landingId, name);
      setBoughtStatuses((prev) => [...prev, { name, status: result.status }]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Buy failed");
    }
  }

  async function handleRotate(d: DomainView) {
    const newHostname = window.prompt(`New hostname to rotate to (replacing ${d.hostname}):`);
    if (!newHostname) return;
    setError(null);
    try {
      await rotateDomain(landingId, newHostname);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotate failed");
    }
  }

  async function handleFlag(id: string) {
    setError(null);
    try {
      await flagDomain(id, "manual");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag failed");
    }
  }

  async function handleRetry(id: string) {
    setError(null);
    try {
      await retryDomain(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }

  return (
    <div className="domains-panel">
      {/* Provisioning section: keyword search → suggestions → buy */}
      <section className="domains-provision">
        <form className="domains-search" onSubmit={handleSearch}>
          <input
            className="domains-input"
            placeholder="Brand or keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="btn" type="submit" disabled={searchBusy || !keyword}>
            Search
          </button>
        </form>
        {searchError && (
          <p className="domains-error" role="alert">
            {searchError}
          </p>
        )}
        {candidates.length > 0 && (
          <ul className="domains-candidates">
            {candidates.map((c) => (
              <li key={c.name} className="domains-candidate-item">
                <span>{c.name}</span>
                <span>${c.priceUsd}/yr</span>
                {c.available ? (
                  <button
                    className="btn-sm"
                    type="button"
                    onClick={() => handleBuy(c.name)}
                  >
                    Buy &amp; provision {c.name}
                  </button>
                ) : (
                  <span className="badge badge-pending">Unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {boughtStatuses.map((b) => (
          <p key={b.name} className="domains-bought-status">
            {b.name}: {b.status}
          </p>
        ))}
      </section>

      {/* Manual escape hatch: attach existing domain */}
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
              {d.status && (
                <span className="domains-status">{d.status}</span>
              )}
            </div>
            {d.statusReason && (
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
              <button className="btn-sm" type="button" onClick={() => handleFlag(d.id)}>
                Mark flagged
              </button>
              <button className="btn-sm" type="button" onClick={() => handleRetry(d.id)}>
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
