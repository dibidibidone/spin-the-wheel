import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { refreshDomain } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "../../errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    const domain = await refreshDomain(id, vercelConfigFromEnv());
    return NextResponse.json({ domain });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
