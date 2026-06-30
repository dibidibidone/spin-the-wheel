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
    const prevStatus = row.status;
    try {
      const newStatus = await advanceDomain(providers, row.id);
      if (newStatus !== prevStatus) advanced += 1;
    } catch (err) {
      // A row deleted mid-pass (or any other transient error) must not abort the whole pass.
      console.error(`reconcilePending: failed to advance ${row.id}:`, err);
    }
  }
  return { advanced };
}
