import type { Metadata } from "next";
import type { LandingView } from "@/lib/types";

export function buildMetadata(view: LandingView): Metadata {
  const meta: Metadata = { title: view.metaTitle, description: view.metaDescription };
  if (view.assets.faviconUrl) meta.icons = { icon: view.assets.faviconUrl };
  return meta;
}
