const API_BASE = "https://api.vercel.com";

export type VercelConfig = { token: string; projectId: string; teamId?: string };

export type VercelDomain = {
  name: string;
  verified: boolean;
  verification: { type: string; domain: string; value: string; reason: string }[];
};

export class VercelApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
    this.code = code;
  }
}

export function vercelConfigFromEnv(): VercelConfig {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token) throw new Error("VERCEL_TOKEN is not set");
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not set");
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || undefined };
}

function buildUrl(path: string, config: VercelConfig): string {
  const url = new URL(`${API_BASE}${path}`);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  return url.toString();
}

async function call(config: VercelConfig, path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(buildUrl(path, config), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (res.status === 204) return null;
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  if (!res.ok) {
    throw new VercelApiError(
      res.status,
      body.error?.code ?? "unknown",
      body.error?.message ?? "Vercel API request failed",
    );
  }
  return body;
}

function toDomain(body: unknown): VercelDomain {
  const b = body as Partial<VercelDomain> & { name: string };
  return { name: b.name, verified: b.verified ?? false, verification: b.verification ?? [] };
}

export async function attachDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v10/projects/${config.projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  return toDomain(body);
}

export async function getDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v9/projects/${config.projectId}/domains/${hostname}`, {
    method: "GET",
  });
  return toDomain(body);
}

export async function verifyDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v9/projects/${config.projectId}/domains/${hostname}/verify`, {
    method: "POST",
  });
  return toDomain(body);
}

export async function removeDomain(config: VercelConfig, hostname: string): Promise<void> {
  await call(config, `/v9/projects/${config.projectId}/domains/${hostname}`, { method: "DELETE" });
}
