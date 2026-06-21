import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { themeToCssVars } from "@/lib/theme";
import { buildMetadata } from "./buildMetadata";
import { WheelClient } from "./Wheel.client";

type Params = { params: Promise<{ domain: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  return view ? buildMetadata(view) : {};
}

export default async function LandingPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();

  // SECURITY (Plan 2): theme values are injected into an inline style attribute.
  // They are trusted seed data in Plan 1; when the CMS makes `theme` editable,
  // validate each value matches an expected color pattern on write.
  const style = themeToCssVars(view.theme) as CSSProperties;

  return (
    <main className="landing" style={style}>
      <header className="landing-top">
        <button className="back-btn" aria-label={view.texts.backLabel}>‹ {view.texts.backLabel}</button>
      </header>

      <section className="landing-hero">
        {view.assets.logoUrl && <img className="landing-logo" src={view.assets.logoUrl} alt="" />}
        <h1 className="landing-title">{view.texts.heading}</h1>
        <p className="landing-subtitle">{view.texts.subtitle}</p>
      </section>

      {view.assets.coinImageUrl && <img className="landing-coin" src={view.assets.coinImageUrl} alt="" />}

      <WheelClient landing={view} />
    </main>
  );
}
