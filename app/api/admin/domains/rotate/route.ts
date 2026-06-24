import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { rotateDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../errors";

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { landingId, hostname } = (await req.json().catch(() => ({}))) as { landingId?: string; hostname?: string };
  if (!landingId || !hostname) return NextResponse.json({ error: "landingId and hostname are required" }, { status: 400 });
  try {
    const domainId = await rotateDomain(providersFromEnv(), landingId, hostname);
    return NextResponse.json({ domainId }, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
