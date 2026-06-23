import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePwaInstall } from "./usePwaInstall";

beforeEach(() => {
  // jsdom lacks matchMedia + serviceWorker; stub them.
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue(undefined) },
  });
});

it("calls the deferred prompt on promptInstall when one was captured", async () => {
  const { result } = renderHook(() => usePwaInstall());
  const prompt = vi.fn().mockResolvedValue(undefined);
  const evt = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  act(() => { window.dispatchEvent(evt); });
  act(() => { result.current.promptInstall(); });
  expect(prompt).toHaveBeenCalledTimes(1);
});

it("opens the iOS hint instead of prompting on iOS", () => {
  vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
  const { result } = renderHook(() => usePwaInstall());
  expect(result.current.platform).toBe("ios");
  act(() => { result.current.promptInstall(); });
  expect(result.current.iosHintOpen).toBe(true);
});
