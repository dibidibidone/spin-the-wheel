import { useEffect, useRef, type MutableRefObject } from "react";
import type { SlotController, SlotStatus } from "./slotController";

// A self-scheduling requestAnimationFrame loop (the reels are DOM over the
// Canvas, so this is independent of R3F's useFrame). It advances the controller,
// writes each reel's transform, and reports status transitions.
export function useSlotDriver({ controller, reelRefs, onStatus }: {
  controller: SlotController;
  reelRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onStatus: (s: SlotStatus) => void;
}) {
  const cb = useRef(onStatus);
  cb.current = onStatus;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let prev: SlotStatus = controller.status;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      controller.update(dt);
      for (let i = 0; i < controller.reels; i++) {
        const el = reelRefs.current[i];
        if (!el) continue;
        const stripLen = controller.strips[i]?.length ?? controller.spinRows + controller.rows;
        const pct = ((controller.spinRows - controller.offsets[i]) / stripLen) * 100;
        el.style.transform = `translateY(-${pct}%)`;
      }
      if (controller.status !== prev) {
        prev = controller.status;
        cb.current(controller.status);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controller, reelRefs]);
}
