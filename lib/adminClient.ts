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

export function createLandingReq(body: { name: string }): Promise<{ id: string }> {
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
