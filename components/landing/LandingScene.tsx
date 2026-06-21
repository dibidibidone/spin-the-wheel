import type { CSSProperties } from "react";
import { themeToCssVars } from "@/lib/theme";
import { WheelClient } from "@/app/[domain]/Wheel.client";
import type { LandingView } from "@/lib/types";

export function LandingScene({ view }: { view: LandingView }) {
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
