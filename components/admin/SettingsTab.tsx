"use client";

import { useState } from "react";
import { Field } from "./Field";
import { patchLanding } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { name, slug, status });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-panel">
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Slug" value={slug} onChange={setSlug} />
      <label className="field">
        <span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </label>
      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
