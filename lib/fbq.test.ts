import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureBaseSnippet, initPixels, track } from "./fbq";

declare global { interface Window { fbq?: (...a: unknown[]) => void; _fbq?: unknown; } }

beforeEach(() => { delete window.fbq; delete window._fbq; document.head.innerHTML = ""; document.body.innerHTML = ""; });

describe("fbq helper", () => {
  it("ensureBaseSnippet defines window.fbq and injects the loader once", () => {
    ensureBaseSnippet();
    expect(typeof window.fbq).toBe("function");
    const before = document.querySelectorAll('script[src*="fbevents.js"]').length;
    ensureBaseSnippet(); // idempotent
    expect(document.querySelectorAll('script[src*="fbevents.js"]').length).toBe(before);
  });
  it("initPixels inits each id once; track forwards the event", () => {
    window.fbq = vi.fn();
    initPixels(["100000000001", "100000000002"]);
    initPixels(["100000000001"]); // already inited -> no second init
    track("PageView");
    track("Lead", { value: 1 });
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["init", "100000000001"]);
    expect(calls).toContainEqual(["init", "100000000002"]);
    expect(calls.filter((c) => c[0] === "init" && c[1] === "100000000001")).toHaveLength(1);
    expect(calls).toContainEqual(["track", "PageView", undefined]);
    expect(calls).toContainEqual(["track", "Lead", { value: 1 }]);
  });
});
