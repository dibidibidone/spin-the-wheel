"use client";

import { useState, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import { templateKind } from "@/lib/templateKind";
import type { EditableLanding } from "@/lib/admin/types";

const TEMPLATES = ["classic-2d", "jackpot-vault", "alchemy-lab", "book-of-ra", "gates-of-olympus"] as const;

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [template, setTemplate] = useState(landing.template);
  const [logoUrl, setLogoUrl] = useState<string | null>(landing.logoUrl);
  const [redirectUrl, setRedirectUrl] = useState(landing.redirectUrl);
  const [pwaName, setPwaName] = useState(landing.pwaName);
  const [pwaIconUrl, setPwaIconUrl] = useState<string | null>(landing.pwaIconUrl);
  const [winText, setWinText] = useState(landing.winText);
  const [spinsBeforeWin, setSpins] = useState(landing.spinsBeforeWin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const isSlot = templateKind(template) === "slot";

  async function onUpload(set: (u: string) => void, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      set(url);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, {
        name, slug, status, template, logoUrl, redirectUrl, pwaName, pwaIconUrl,
        ...(isSlot ? { winText, spinsBeforeWin: Number(spinsBeforeWin) } : {}),
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

      <label className="field">
        <span>Casino logo</span>
        <input type="file" accept="image/*" onChange={(e) => onUpload(setLogoUrl, e)} />
      </label>
      {logoUrl && <img className="asset-preview" src={logoUrl} alt="" />}

      {isSlot && (
        <>
          <Field label="Win text" value={winText} onChange={setWinText} />
          <label className="field">
            <span>Spins before win</span>
            <input aria-label="Spins before win" type="number" min={1} value={spinsBeforeWin} onChange={(e) => setSpins(Number(e.target.value))} />
          </label>
        </>
      )}

      <fieldset className="pwa-group">
        <legend>Download app (PWA)</legend>
        <label className="field">
          <span>App link</span>
          <input aria-label="App link" type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://offer.example.com (the PWA opens this)" />
        </label>
        <Field label="App name" value={pwaName} onChange={setPwaName} />
        <label className="field">
          <span>App icon</span>
          <input type="file" accept="image/*" onChange={(e) => onUpload(setPwaIconUrl, e)} />
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
