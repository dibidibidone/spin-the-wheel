import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { retryDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../../errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    const status = await retryDomain(providersFromEnv(), id);
    return NextResponse.json({ domainId: id, status });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
