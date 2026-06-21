"use client";

import { useState, type CSSProperties, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import { themeToCssVars } from "@/lib/theme";
import type { EditableLanding } from "@/lib/admin/types";
import type { ThemeColors } from "@/lib/types";

type AssetKey = "logoUrl" | "faviconUrl" | "coinImageUrl" | "bgImageUrl";
const COLOR_LABELS: Array<[keyof ThemeColors, string]> = [
  ["bg", "Background"], ["surface", "Surface"], ["accent", "Accent"],
  ["gold", "Gold"], ["text", "Text"], ["muted", "Muted"],
];
const ASSETS: Array<[AssetKey, string]> = [
  ["logoUrl", "Logo"], ["faviconUrl", "Favicon"], ["coinImageUrl", "Coin"], ["bgImageUrl", "Background image"],
];

export function BrandingTab({ landing }: { landing: EditableLanding }) {
  const [theme, setTheme] = useState<ThemeColors>(landing.theme);
  const [assets, setAssets] = useState<Record<AssetKey, string | null>>({
    logoUrl: landing.logoUrl,
    faviconUrl: landing.faviconUrl,
    coinImageUrl: landing.coinImageUrl,
    bgImageUrl: landing.bgImageUrl,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const setColor = (k: keyof ThemeColors) => (v: string) => setTheme((p) => ({ ...p, [k]: v }));

  async function onUpload(key: AssetKey, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      setAssets((p) => ({ ...p, [key]: url }));
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { theme, ...assets });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-panel">
      <div className="theme-grid">
        {COLOR_LABELS.map(([key, label]) => (
          <Field key={key} label={label} type="text" value={theme[key]} onChange={setColor(key)} />
        ))}
      </div>

      <div className="theme-preview" style={themeToCssVars(theme) as CSSProperties}>
        <div className="theme-preview-card">
          <span className="theme-preview-title">Aa</span>
          <span className="theme-preview-prize">JACKPOT</span>
          <button type="button" className="theme-preview-btn">Spin</button>
        </div>
      </div>

      <div className="assets">
        {ASSETS.map(([key, label]) => (
          <div key={key} className="asset">
            <label className="field">
              <span>{label}</span>
              <input type="file" accept="image/*" onChange={(e) => onUpload(key, e)} />
            </label>
            {assets[key] && <img className="asset-preview" src={assets[key] as string} alt="" />}
          </div>
        ))}
      </div>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
