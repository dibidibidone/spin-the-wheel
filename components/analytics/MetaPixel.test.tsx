import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MetaPixel } from "./MetaPixel";

declare global { interface Window { fbq?: (...a: unknown[]) => void; } }
beforeEach(() => { window.fbq = vi.fn(); });

describe("MetaPixel", () => {
  it("inits each pixel and fires exactly one PageView", () => {
    render(<MetaPixel pixelIds={["100000000001", "100000000002"]} />);
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["init", "100000000001"]);
    expect(calls).toContainEqual(["init", "100000000002"]);
    expect(calls.filter((c) => c[0] === "track" && c[1] === "PageView")).toHaveLength(1);
  });

  it("renders nothing and fires nothing when there are no pixels", () => {
    const { container } = render(<MetaPixel pixelIds={[]} />);
    expect(container.firstChild).toBeNull();
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("server-renders a noscript fallback img per id (for JS-disabled browsers)", () => {
    const html = renderToStaticMarkup(<MetaPixel pixelIds={["100000000001", "100000000002"]} />);
    expect(html).toContain("<noscript>");
    expect((html.match(/facebook\.com\/tr/g) ?? []).length).toBe(2);
    expect(html).toContain("id=100000000001");
    expect(html).toContain("id=100000000002");
    expect((html.match(/ev=PageView/g) ?? []).length).toBe(2);
  });
});
