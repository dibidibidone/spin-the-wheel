import type { Metadata } from "next";
import type { LandingView } from "@/lib/types";

export function buildMetadata(view: LandingView): Metadata {
  const meta: Metadata = { title: view.metaTitle, description: view.metaDescription };

  const icons: { icon?: string; apple?: string } = {};
  if (view.assets.faviconUrl) icons.icon = view.assets.faviconUrl;
  if (view.pwaIconUrl) icons.apple = view.pwaIconUrl;
  if (icons.icon || icons.apple) meta.icons = icons;

  // Every template is a PWA-download landing now (2D wheel included).
  meta.manifest = "/manifest";
  meta.appleWebApp = { capable: true, title: view.pwaName || view.texts.heading };

  return meta;
}
