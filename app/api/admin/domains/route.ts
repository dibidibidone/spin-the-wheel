import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { addDomain, listDomains } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "./errors";

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const landingId = new URL(req.url).searchParams.get("landingId");
  if (!landingId) {
    return NextResponse.json({ error: "landingId is required" }, { status: 400 });
  }
  return NextResponse.json({ domains: await listDomains(landingId) });
}

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { landingId, hostname } = (await req.json().catch(() => ({}))) as {
    landingId?: string;
    hostname?: string;
  };
  if (!landingId || !hostname) {
    return NextResponse.json({ error: "landingId and hostname are required" }, { status: 400 });
  }
  try {
    const domain = await addDomain(landingId, hostname, vercelConfigFromEnv());
    return NextResponse.json({ domain }, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
