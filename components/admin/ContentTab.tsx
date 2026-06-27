"use client";

import { useState } from "react";
import { Field } from "./Field";
import { patchLanding } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

export function ContentTab({ landing }: { landing: EditableLanding }) {
  const [f, setF] = useState({
    heading: landing.heading,
    subtitle: landing.subtitle,
    backLabel: landing.backLabel,
    winTitle: landing.winTitle,
    claimLabel: landing.claimLabel,
    almostText: landing.almostText,
    metaTitle: landing.metaTitle ?? "",
    metaDescription: landing.metaDescription ?? "",
    offerHeadline: landing.offerHeadline,
    offerSubline: landing.offerSubline,
    bonusesTotal: String(landing.bonusesTotal),
    countdownMinutes: String(landing.countdownMinutes),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, {
        heading: f.heading,
        subtitle: f.subtitle,
        backLabel: f.backLabel,
        winTitle: f.winTitle,
        claimLabel: f.claimLabel,
        almostText: f.almostText,
        metaTitle: f.metaTitle.trim() || null,
        metaDescription: f.metaDescription.trim() || null,
        offerHeadline: f.offerHeadline,
        offerSubline: f.offerSubline,
        bonusesTotal: Number(f.bonusesTotal),
        countdownMinutes: Number(f.countdownMinutes),
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
      <Field label="Heading" value={f.heading} onChange={set("heading")} />
      <Field label="Subtitle" value={f.subtitle} onChange={set("subtitle")} textarea />
      <Field label="Back button label" value={f.backLabel} onChange={set("backLabel")} />
      <Field label="Win title (use {prize})" value={f.winTitle} onChange={set("winTitle")} />
      <Field label="Claim button label" value={f.claimLabel} onChange={set("claimLabel")} />
      <Field label="Near-miss text" value={f.almostText} onChange={set("almostText")} />
      <Field label="SEO title" value={f.metaTitle} onChange={set("metaTitle")} />
      <Field label="SEO description" value={f.metaDescription} onChange={set("metaDescription")} textarea />
      <fieldset>
        <legend>Conversion</legend>
        <Field label="Offer headline" value={f.offerHeadline} onChange={set("offerHeadline")} />
        <Field label="Offer subline" value={f.offerSubline} onChange={set("offerSubline")} />
        <Field label="Bonuses total" value={f.bonusesTotal} onChange={set("bonusesTotal")} type="number" />
        <Field label="Countdown minutes" value={f.countdownMinutes} onChange={set("countdownMinutes")} type="number" />
      </fieldset>
      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
