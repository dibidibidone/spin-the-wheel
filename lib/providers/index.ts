import { vercelConfigFromEnv } from "@/lib/vercel";
import { namecheapConfigFromEnv, cloudflareConfigFromEnv, originTargetFromEnv } from "./config";
import { createNamecheapRegistrar } from "./namecheap";
import { createCloudflareEdge } from "./cloudflare";
import { createVercelOrigin } from "./vercelOrigin";
import type { Providers } from "./types";

export function providersFromEnv(): Providers {
  return {
    registrar: createNamecheapRegistrar(namecheapConfigFromEnv()),
    edge: createCloudflareEdge(cloudflareConfigFromEnv()),
    origin: createVercelOrigin(vercelConfigFromEnv()),
    originTarget: originTargetFromEnv(),
  };
}
