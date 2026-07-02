"use client";
import { useCallback, useEffect, useState } from "react";
import { presetToRange, type RangePreset } from "@/lib/admin/statsRange";

type FunnelRow = {
  landingId: string; name: string;
  visits: number; downloads: number; opens: number;
  visitToDownloadPct: number; downloadToOpenPct: number; visitToOpenPct: number;
};

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export function StatisticsView({ landings }: { landings: { id: string; name: string }[] }) {
  const [landingId, setLandingId] = useState("all");
  const [preset, setPreset] = useState<RangePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (landingId !== "all") params.set("landingId", landingId);
    if (customFrom || customTo) {
      if (customFrom) params.set("from", new Date(customFrom).toISOString());
      if (customTo) params.set("to", new Date(customTo).toISOString());
    } else {
      const { from, to } = presetToRange(preset);
      if (from) params.set("from", from.toISOString());
      if (to) params.set("to", to.toISOString());
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?${params.toString()}`, { credentials: "same-origin" });
      setRows(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, [landingId, preset, customFrom, customTo]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="stats">
      <div className="stats-filters">
        <label className="field">
          <span>Landing</span>
          <select aria-label="Landing" value={landingId} onChange={(e) => setLandingId(e.target.value)}>
            <option value="all">All landings</option>
            {landings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <div className="stats-presets" role="group" aria-label="Time range">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={preset === p.key && !customFrom && !customTo ? "preset active" : "preset"}
              onClick={() => { setCustomFrom(""); setCustomTo(""); setPreset(p.key); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>From</span>
          <input aria-label="From date" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input aria-label="To date" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </label>
      </div>

      <div className="stat-cards">
        {rows.map((r) => (
          <div className="stat-card" data-testid={`stat-card-${r.landingId}`} key={r.landingId}>
            <h3>{r.name}</h3>
            <p className="stat-nums">
              <span><b>{r.visits}</b> visits</span>
              <span><b>{r.downloads}</b> downloads</span>
              <span><b>{r.opens}</b> opens</span>
            </p>
            <p className="stat-rates">{r.visitToDownloadPct}% → {r.downloadToOpenPct}%</p>
          </div>
        ))}
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Landing</th><th>Visits</th><th>Downloads</th><th>Opens</th>
            <th>Visit→Download</th><th>Download→Open</th><th>Visit→Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.landingId}>
              <td>{r.name}</td><td>{r.visits}</td><td>{r.downloads}</td><td>{r.opens}</td>
              <td>{r.visitToDownloadPct}%</td><td>{r.downloadToOpenPct}%</td><td>{r.visitToOpenPct}%</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr><td colSpan={7} className="empty">No data for this filter yet.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
