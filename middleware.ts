import { NextRequest, NextResponse } from "next/server";
import { decideHostRoute } from "@/lib/hostRoute";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const decision = decideHostRoute(host, req.nextUrl.pathname, process.env.ADMIN_HOST);
  if (decision.kind === "pass") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = decision.path;
  return NextResponse.rewrite(url);
}

export const config = {
  // Exclude Next internals, API, the /prototypes showcase routes, and static files;
  // those must never be host-rewritten.
  matcher: ["/((?!_next/|api/|prototypes/|favicon.ico|.*\\..*).*)"],
};
