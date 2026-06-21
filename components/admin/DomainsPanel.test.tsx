import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DomainsPanel } from "@/components/admin/DomainsPanel";

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const cname = { type: "CNAME", name: "promo", value: "cname.vercel-dns.com" };

function installFetch() {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET" && input.startsWith("/api/admin/domains?")) {
      return jsonRes({
        domains: [
          { id: "d1", hostname: "promo.boomzino.com", verified: false, vercelStatus: "pending", dns: cname },
        ],
      });
    }
    if (method === "POST" && input === "/api/admin/domains") {
      return jsonRes(
        {
          domain: {
            id: "d2",
            hostname: "win.boomzino.com",
            verified: false,
            vercelStatus: "pending",
            dns: { type: "CNAME", name: "win", value: "cname.vercel-dns.com" },
          },
        },
        201,
      );
    }
    if (method === "POST" && input === "/api/admin/domains/d1/verify") {
      return jsonRes({
        domain: { id: "d1", hostname: "promo.boomzino.com", verified: true, vercelStatus: "verified", dns: cname },
      });
    }
    if (method === "DELETE" && input === "/api/admin/domains/d1") {
      return jsonRes(null, 204);
    }
    return jsonRes({ error: "unexpected" }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => vi.unstubAllGlobals());

describe("DomainsPanel", () => {
  it("lists existing domains with DNS instructions for unverified ones", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    expect(await screen.findByText("promo.boomzino.com")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(/cname\.vercel-dns\.com/)).toBeInTheDocument();
  });

  it("adds a new domain", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.type(screen.getByLabelText("Domain to add"), "win.boomzino.com");
    await userEvent.click(screen.getByRole("button", { name: "Add domain" }));

    expect(await screen.findByText("win.boomzino.com")).toBeInTheDocument();
  });

  it("re-checks status and shows Verified, hiding the DNS hint", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.click(screen.getByRole("button", { name: "Check status" }));

    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.queryByText(/cname\.vercel-dns\.com/)).not.toBeInTheDocument();
  });

  it("removes a domain", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(screen.queryByText("promo.boomzino.com")).not.toBeInTheDocument(),
    );
  });
});
