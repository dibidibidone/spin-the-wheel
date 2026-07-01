import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

const beaconEvent = vi.fn();
vi.mock("@/lib/track", () => ({ beaconEvent: (t: string) => beaconEvent(t) }));
const track = vi.fn();
vi.mock("@/lib/fbq", () => ({ ensureBaseSnippet: vi.fn(), initPixels: vi.fn(), track: (...a: unknown[]) => track(...a) }));

import { LaunchRedirect } from "./LaunchRedirect.client";

let replace: ReturnType<typeof vi.fn>;
function setStandalone(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes("standalone"), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return false; }, onchange: null,
  })) as unknown as typeof window.matchMedia;
}
beforeEach(() => {
  vi.useFakeTimers();
  beaconEvent.mockReset(); track.mockReset();
  replace = vi.fn();
  Object.defineProperty(window, "location", { value: { replace }, writable: true, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  delete (window.navigator as unknown as { standalone?: boolean }).standalone;
});

describe("LaunchRedirect", () => {
  it("standalone with pixels: beacons open, fires Lead, redirects after the delay", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).toHaveBeenCalledWith("Lead");
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });

  it("standalone WITHOUT pixels: still beacons open, no Lead, redirects after the delay", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={[]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });

  it("not standalone: redirects immediately, no open beacon, no Lead", () => {
    setStandalone(false);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
    expect(beaconEvent).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("iOS standalone (navigator.standalone): beacons open + Lead, redirects after the delay", () => {
    setStandalone(false);
    Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).toHaveBeenCalledWith("Lead");
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });
});
