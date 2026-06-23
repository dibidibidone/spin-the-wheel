"use client";

import { useState, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

const TEMPLATES = ["classic-2d", "jackpot-vault", "alchemy-lab", "book-of-ra", "gates-of-olympus"] as const;

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [template, setTemplate] = useState(landing.template);
  const [pwaName, setPwaName] = useState(landing.pwaName);
  const [pwaIconUrl, setPwaIconUrl] = useState<string | null>(landing.pwaIconUrl);
  const [pwaUrl, setPwaUrl] = useState(landing.pwaUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onIcon(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      setPwaIconUrl(url);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { name, slug, status, template, pwaName, pwaIconUrl, pwaUrl });
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
      <label className="field">
        <span>Template</span>
        <select aria-label="Template" value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <fieldset className="pwa-group">
        <legend>Download app (PWA)</legend>
        <Field label="App name" value={pwaName} onChange={setPwaName} />
        <label className="field">
          <span>App link</span>
          <input aria-label="App link" type="url" value={pwaUrl} onChange={(e) => setPwaUrl(e.target.value)} placeholder="https://offer.example.com (defaults to Redirect URL)" />
        </label>
        <label className="field">
          <span>App icon</span>
          <input type="file" accept="image/*" onChange={onIcon} />
        </label>
        {pwaIconUrl && <img className="asset-preview" src={pwaIconUrl} alt="" />}
      </fieldset>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
