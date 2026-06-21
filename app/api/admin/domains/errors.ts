import { NextResponse } from "next/server";
import { InvalidHostnameError } from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

export function domainErrorResponse(err: unknown): NextResponse {
  if (err instanceof InvalidHostnameError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof VercelApiError) {
    return NextResponse.json({ error: `Vercel: ${err.message}`, code: err.code }, { status: 502 });
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) {
    return NextResponse.json({ error: "That domain is already added." }, { status: 409 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
