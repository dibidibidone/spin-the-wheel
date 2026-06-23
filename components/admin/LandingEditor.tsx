"use client";

import { useState } from "react";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { WheelTab } from "./WheelTab";
import { SettingsTab } from "./SettingsTab";
import { DomainsPanel } from "./DomainsPanel";
import type { EditableLanding } from "@/lib/admin/types";

const ALL_TABS = ["Content", "Branding", "Wheel", "Settings", "Domains"] as const;
type Tab = (typeof ALL_TABS)[number];

export function LandingEditor({ landing }: { landing: EditableLanding }) {
  const [tab, setTab] = useState<Tab>("Content");
  // The 3D templates render built-in scenes, so the 2D Branding (theme + images)
  // tab is inert for them — hide it entirely.
  const is3d = landing.template !== "classic-2d";
  const tabs = ALL_TABS.filter((t) => t !== "Branding" || !is3d);
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
      {tab === "Branding" && !is3d && <BrandingTab landing={landing} />}
      {tab === "Wheel" && <WheelTab landing={landing} />}
      {tab === "Settings" && <SettingsTab landing={landing} />}
      {tab === "Domains" && <DomainsPanel landingId={landing.id} />}
    </div>
  );
}
