import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { flagDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../../errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
  try {
    await flagDomain(id, reason ?? "manual");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
