"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLandingReq } from "@/lib/adminClient";

export function NewLandingButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { id } = await createLandingReq({ name: name.trim() });
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
      <button className="btn-primary" onClick={create} disabled={busy}>Create</button>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
