import { NextResponse } from "next/server";
import { reconcilePending } from "@/lib/domains/reconcile";
import { providersFromEnv } from "@/lib/providers";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await reconcilePending(providersFromEnv());
  return NextResponse.json(result);
}
