"use client";

import { useState } from "react";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { WheelTab } from "./WheelTab";
import { SettingsTab } from "./SettingsTab";
import { DomainsPanel } from "./DomainsPanel";
import type { EditableLanding } from "@/lib/admin/types";

const TABS = ["Content", "Branding", "Wheel", "Settings", "Domains"] as const;
type Tab = (typeof TABS)[number];

export function LandingEditor({ landing }: { landing: EditableLanding }) {
  const [tab, setTab] = useState<Tab>("Content");
  return (
    <div className="editor">
      <nav className="tabs">
        {TABS.map((t) => (
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
      {tab === "Branding" && <BrandingTab landing={landing} />}
      {tab === "Wheel" && <WheelTab landing={landing} />}
      {tab === "Settings" && <SettingsTab landing={landing} />}
      {tab === "Domains" && <DomainsPanel landingId={landing.id} />}
    </div>
  );
}
