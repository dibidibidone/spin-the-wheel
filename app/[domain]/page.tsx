import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { buildMetadata } from "./buildMetadata";
import { LandingScene } from "@/components/landing/LandingScene";

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
  return <LandingScene view={view} />;
}
