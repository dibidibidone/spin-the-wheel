import { describe, it, expect } from "vitest";
import { claimReducer, type ClaimStep } from "./claimMachine";

describe("claimReducer", () => {
  it("walks the happy path hidden→reveal→form→submitting→redirect", () => {
    let s: ClaimStep = "hidden";
    s = claimReducer(s, { type: "won" });    expect(s).toBe("reveal");
    s = claimReducer(s, { type: "open" });   expect(s).toBe("form");
    s = claimReducer(s, { type: "submit" }); expect(s).toBe("submitting");
    s = claimReducer(s, { type: "done" });   expect(s).toBe("redirect");
  });

  it("reset returns to hidden from any state", () => {
    expect(claimReducer("form", { type: "reset" })).toBe("hidden");
    expect(claimReducer("submitting", { type: "reset" })).toBe("hidden");
    expect(claimReducer("hidden", { type: "reset" })).toBe("hidden");
    expect(claimReducer("reveal", { type: "reset" })).toBe("hidden");
    expect(claimReducer("redirect", { type: "reset" })).toBe("hidden");
  });

  it("ignores actions that don't apply to the current state", () => {
    expect(claimReducer("hidden", { type: "submit" })).toBe("hidden");
    expect(claimReducer("reveal", { type: "done" })).toBe("reveal");
    expect(claimReducer("redirect", { type: "won" })).toBe("redirect");
    expect(claimReducer("redirect", { type: "done" })).toBe("redirect");
  });
});
