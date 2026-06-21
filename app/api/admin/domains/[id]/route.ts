import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { removeDomain } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "../errors";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    await removeDomain(id, vercelConfigFromEnv());
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
