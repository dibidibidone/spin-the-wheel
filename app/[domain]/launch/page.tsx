import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { LaunchRedirect } from "./LaunchRedirect.client";

type Params = { params: Promise<{ domain: string }> };

export default async function LaunchPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();
  return <LaunchRedirect pixelIds={view.fbPixelIds} redirectUrl={view.redirectUrl} />;
}
