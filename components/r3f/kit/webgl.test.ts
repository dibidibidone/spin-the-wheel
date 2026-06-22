import { describe, it, expect } from "vitest";
import { isWebGLAvailable } from "./webgl";

describe("isWebGLAvailable", () => {
  it("returns true when a webgl context is obtainable", () => {
    const doc = { createElement: () => ({ getContext: (k: string) => (k.includes("webgl") ? {} : null) }) } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(true);
  });

  it("returns false when no context is obtainable", () => {
    const doc = { createElement: () => ({ getContext: () => null }) } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(false);
  });

  it("returns false when canvas creation throws", () => {
    const doc = { createElement: () => { throw new Error("no canvas"); } } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(false);
  });
});
