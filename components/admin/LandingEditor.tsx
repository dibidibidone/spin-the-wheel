"use client";

import { useState } from "react";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { WheelTab } from "./WheelTab";
import { SettingsTab } from "./SettingsTab";
import { DomainsPanel } from "./DomainsPanel";
import { templateKind } from "@/lib/templateKind";
import type { EditableLanding } from "@/lib/admin/types";

const ALL_TABS = ["Content", "Branding", "Wheel", "Settings", "Domains"] as const;
type Tab = (typeof ALL_TABS)[number];

export function LandingEditor({ landing }: { landing: EditableLanding }) {
  const [tab, setTab] = useState<Tab>("Content");
  const kind = templateKind(landing.template);
  // Branding is only for the 2D wheel; the Wheel tab only for wheels (not slots).
  const tabs = ALL_TABS.filter((t) => {
    if (t === "Branding") return kind === "wheel-2d";
    if (t === "Wheel") return kind !== "slot";
    return true;
  });
  return (
    <div className="editor">
      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={t === tab ? "tab active" : "tab"}
            data-testid={`tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Content" && <ContentTab landing={landing} />}
      {tab === "Branding" && kind === "wheel-2d" && <BrandingTab landing={landing} />}
      {tab === "Wheel" && kind !== "slot" && <WheelTab landing={landing} />}
      {tab === "Settings" && <SettingsTab landing={landing} />}
      {tab === "Domains" && <DomainsPanel landingId={landing.id} />}
    </div>
  );
}
