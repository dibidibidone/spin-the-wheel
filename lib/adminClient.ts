async function sendJson<T>(method: string, url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function createLandingReq(body: { name: string; template: string }): Promise<{ id: string }> {
  return sendJson("POST", "/api/admin/landings", body);
}

export function patchLanding(id: string, body: unknown): Promise<{ ok: true }> {
  return sendJson("PATCH", `/api/admin/landings/${id}`, body);
}

export function putWheel(id: string, body: unknown): Promise<{ ok: true }> {
  return sendJson("PUT", `/api/admin/landings/${id}/wheel`, body);
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed");
  }
  return res.json() as Promise<{ url: string }>;
}

export async function suggestDomains(keyword: string): Promise<{ candidates: { name: string; available: boolean; priceUsd: number }[] }> {
  const res = await fetch(`/api/admin/domains/suggest?keyword=${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error((await res.json()).error ?? "suggest failed");
  return res.json();
}
export async function buyDomain(landingId: string, hostname: string): Promise<{ domainId: string; status: string }> {
  const res = await fetch("/api/admin/domains/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingId, hostname }) });
  if (!res.ok) throw new Error((await res.json()).error ?? "buy failed");
  return res.json();
}
export async function rotateDomain(landingId: string, hostname: string): Promise<{ domainId: string }> {
  const res = await fetch("/api/admin/domains/rotate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingId, hostname }) });
  if (!res.ok) throw new Error((await res.json()).error ?? "rotate failed");
  return res.json();
}
export async function flagDomain(id: string, reason: string): Promise<void> {
  const res = await fetch(`/api/admin/domains/${id}/flag`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `flagDomain failed (${res.status})`);
  }
}
export async function retryDomain(id: string): Promise<void> {
  const res = await fetch(`/api/admin/domains/${id}/retry`, { method: "POST" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `retryDomain failed (${res.status})`);
  }
}
