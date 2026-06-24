import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { domainErrorResponse } from "../errors";

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const keyword = url.searchParams.get("keyword");
  if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  const tlds = (url.searchParams.get("tlds") ?? "com,net,click,online,xyz").split(",");
  try {
    const candidates = await providersFromEnv().registrar.suggest(keyword, tlds);
    return NextResponse.json({ candidates });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
