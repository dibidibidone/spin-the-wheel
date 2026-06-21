import { describe, it, expect } from "vitest";
import { decideHostRoute } from "@/lib/hostRoute";

describe("decideHostRoute", () => {
  it("rewrites a landing host to /<host><path>", () => {
    expect(decideHostRoute("promo1.com", "/", "admin.example.com"))
      .toEqual({ kind: "rewrite", path: "/promo1.com/" });
    expect(decideHostRoute("promo1.com", "/anything", "admin.example.com"))
      .toEqual({ kind: "rewrite", path: "/promo1.com/anything" });
  });

  it("passes through the admin host", () => {
    expect(decideHostRoute("admin.example.com", "/admin", "admin.example.com"))
      .toEqual({ kind: "pass" });
  });

  it("passes through when host is missing", () => {
    expect(decideHostRoute(null, "/", "admin.example.com")).toEqual({ kind: "pass" });
  });
});
