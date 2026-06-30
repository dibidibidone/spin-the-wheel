import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { LaunchRedirect } from "./LaunchRedirect.client";

declare global { interface Window { fbq?: (...a: unknown[]) => void; } }

let replace: ReturnType<typeof vi.fn>;
function setStandalone(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes("standalone"), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, onchange: null })) as unknown as typeof window.matchMedia;
}
beforeEach(() => {
  vi.useFakeTimers();
  window.fbq = vi.fn();
  replace = vi.fn();
  Object.defineProperty(window, "location", { value: { replace }, writable: true, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  delete (window.navigator as unknown as { standalone?: boolean }).standalone;
});

describe("LaunchRedirect", () => {
  it("standalone PWA open: fires Lead then redirects to the admin link", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["track", "Lead", undefined]);
    expect(replace).not.toHaveBeenCalled(); // waits ~500ms
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });
  it("normal browser (not standalone): redirects immediately, no Lead", () => {
    setStandalone(false);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
    expect((window.fbq as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[1] === "Lead")).toBe(false);
  });
  it("iOS standalone (navigator.standalone) fires Lead then redirects", () => {
    setStandalone(false); // display-mode arm is false; iOS arm drives it
    Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["track", "Lead", undefined]);
    expect(replace).not.toHaveBeenCalled(); // waits ~500ms
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });
});
