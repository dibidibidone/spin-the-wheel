"use client";

import { useState } from "react";
import { putWheel } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

type Row = { label: string; icon: string; color: string; weight: number };

export function WheelTab({ landing }: { landing: EditableLanding }) {
  const [rows, setRows] = useState<Row[]>(
    landing.prizes.map((p) => ({ label: p.label, icon: p.icon, color: p.color, weight: p.weight })),
  );
  const [winningIndex, setWinningIndex] = useState(
    Math.max(0, landing.prizes.findIndex((p) => p.id === landing.winningPrizeId)),
  );
  const [spinsBeforeWin, setSpins] = useState(landing.spinsBeforeWin);
  const [redirectUrl, setRedirectUrl] = useState(landing.redirectUrl);
  const [prizeParam, setPrizeParam] = useState(landing.redirectPrizeParam ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function setRow(i: number, patch: Partial<Row>) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((p) => [...p, { label: "New prize", icon: "", color: "#1E7A3A", weight: 1 }]);
  }
  function removeRow(i: number) {
    setRows((p) => p.filter((_, idx) => idx !== i));
    setWinningIndex((w) => (w >= i && w > 0 ? w - 1 : w));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    setRows((p) => {
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setWinningIndex((w) => (w === i ? j : w === j ? i : w));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await putWheel(landing.id, {
        spinsBeforeWin: Number(spinsBeforeWin),
        winningIndex,
        redirectUrl,
        redirectPrizeParam: prizeParam.trim() || null,
        prizes: rows.map((r) => ({ label: r.label, icon: r.icon, color: r.color, weight: Number(r.weight) })),
      });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-panel">
      <div className="prize-list">
        {rows.map((r, i) => (
          <div className="prize-row" data-testid="prize-row" key={i}>
            <input type="radio" name="winner" aria-label={`Winner: ${r.label}`} checked={winningIndex === i} onChange={() => setWinningIndex(i)} />
            <input aria-label={`Label ${i}`} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
            <input aria-label={`Icon ${i}`} className="icon-input" value={r.icon} onChange={(e) => setRow(i, { icon: e.target.value })} />
            <input aria-label={`Color ${i}`} type="color" value={r.color} onChange={(e) => setRow(i, { color: e.target.value })} />
            <input aria-label={`Weight ${i}`} className="weight-input" type="number" min={0} value={r.weight} onChange={(e) => setRow(i, { weight: Number(e.target.value) })} />
            <button type="button" onClick={() => move(i, -1)} aria-label={`Move up ${i}`}>↑</button>
            <button type="button" onClick={() => move(i, 1)} aria-label={`Move down ${i}`}>↓</button>
            <button type="button" onClick={() => removeRow(i)} aria-label={`Remove ${i}`}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={addRow}>Add prize</button>

      <div className="wheel-config">
        <label className="field">
          <span>Spins before win (N)</span>
          <input type="number" min={1} value={spinsBeforeWin} onChange={(e) => setSpins(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Redirect URL</span>
          <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>Prize query param (optional)</span>
          <input value={prizeParam} onChange={(e) => setPrizeParam(e.target.value)} />
        </label>
      </div>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
