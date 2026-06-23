"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLandingReq } from "@/lib/adminClient";

const TEMPLATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "classic-2d", label: "Classic 2D wheel" },
  { value: "jackpot-vault", label: "Jackpot Vault (3D)" },
  { value: "alchemy-lab", label: "Alchemy Lab (3D)" },
  { value: "book-of-ra", label: "Book of Ra (slot)" },
  { value: "gates-of-olympus", label: "Gates of Olympus (slot)" },
];

export function NewLandingButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("classic-2d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { id } = await createLandingReq({ name: name.trim(), template });
      router.push(`/admin/landings/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="new-landing">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New landing name"
        aria-label="New landing name"
      />
      <select aria-label="Template" value={template} onChange={(e) => setTemplate(e.target.value)}>
        {TEMPLATE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button className="btn-primary" onClick={create} disabled={busy || !name.trim()}>Create</button>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
