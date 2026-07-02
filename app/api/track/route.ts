import { getLandingIdByHost } from "@/lib/tenant";
import { recordEvent, isTrackType } from "@/lib/events";

function readVid(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)vid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new Response(null, { status: 400 });

  const body = await req.json().catch(() => null);
  const type = (body as { type?: unknown } | null)?.type;
  if (!isTrackType(type)) return new Response(null, { status: 400 });

  const landingId = await getLandingIdByHost(host);
  if (!landingId) return new Response(null, { status: 404 });

  let visitorId = readVid(req);
  const minted = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  await recordEvent({ landingId, visitorId, type });

  const headers = new Headers();
  if (minted) {
    headers.append(
      "Set-Cookie",
      `vid=${visitorId}; Path=/; Max-Age=63072000; HttpOnly; Secure; SameSite=Lax`,
    );
  }
  return new Response(null, { status: 204, headers });
}
