import { prisma } from "@/lib/db";
import type { Providers } from "@/lib/providers/types";
import { advanceDomain } from "./service";
import { ACTIVE_STATUSES } from "./status";

// One idempotent pass: advance every non-terminal domain by a single step.
// Safe to run repeatedly (at-least-once) — each step is keyed off persisted status.
export async function reconcilePending(providers: Providers): Promise<{ advanced: number }> {
  const rows = await prisma.domain.findMany({ where: { status: { in: ACTIVE_STATUSES } } });
  let advanced = 0;
  for (const row of rows) {
    await advanceDomain(providers, row.id);
    advanced += 1;
  }
  return { advanced };
}
