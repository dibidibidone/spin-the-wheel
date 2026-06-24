import type { CloudflareConfig } from "./config";
import type { EdgeDns, DnsRecordInput, ZoneResult, SslStatus } from "./types";

const API = "https://api.cloudflare.com/client/v4";

export class CloudflareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudflareError";
  }
}

type Envelope<T> = { success: boolean; errors: { message: string }[]; result: T };

export function createCloudflareEdge(config: CloudflareConfig): EdgeDns {
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json", ...init.headers },
    });
    const body = (await res.json().catch(() => ({}))) as Envelope<T>;
    if (!res.ok || !body.success) {
      throw new CloudflareError(body.errors?.[0]?.message ?? `Cloudflare request failed (${res.status})`);
    }
    return body.result;
  }

  return {
    async createZone(name): Promise<ZoneResult> {
      const r = await call<{ id: string; name_servers: string[] }>("/zones", {
        method: "POST",
        body: JSON.stringify({ name, account: { id: config.accountId }, type: "full" }),
      });
      return { zoneId: r.id, nameservers: r.name_servers };
    },

    async upsertRecords(zoneId, records): Promise<void> {
      const existing = await call<{ id: string; name: string; type: string }[]>(`/zones/${zoneId}/dns_records`, { method: "GET" });
      for (const rec of records) {
        const match = existing.find((e) => e.name === rec.name && e.type === rec.type);
        const payload = JSON.stringify({ type: rec.type, name: rec.name, content: rec.content, proxied: rec.proxied, ttl: 1 });
        if (match) {
          await call(`/zones/${zoneId}/dns_records/${match.id}`, { method: "PUT", body: payload });
        } else {
          await call(`/zones/${zoneId}/dns_records`, { method: "POST", body: payload });
        }
      }
    },

    async ensureSsl(zoneId): Promise<SslStatus> {
      // Tolerate a not-yet-propagated zone: treat an SSL-settings failure as "not ready yet".
      const r = await call<{ status?: string }>(`/zones/${zoneId}/ssl/universal/settings`, { method: "GET" }).catch(() => ({ status: undefined }));
      if (r.status === "active") return "active";
      return r.status ? "pending" : "none";
    },

    async deleteZone(zoneId): Promise<void> {
      await call(`/zones/${zoneId}`, { method: "DELETE" });
    },
  };
}
