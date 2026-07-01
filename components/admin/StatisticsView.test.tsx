import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatisticsView } from "./StatisticsView";

const rows = [
  { landingId: "l1", name: "Promo A", visits: 200, downloads: 50, opens: 10, visitToDownloadPct: 25, downloadToOpenPct: 20, visitToOpenPct: 5 },
  { landingId: "l2", name: "Promo B", visits: 100, downloads: 10, opens: 2, visitToDownloadPct: 10, downloadToOpenPct: 20, visitToOpenPct: 2 },
];
const landings = [{ id: "l1", name: "Promo A" }, { id: "l2", name: "Promo B" }];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  vi.stubGlobal("fetch", fetchMock);
});

describe("StatisticsView", () => {
  it("loads all-landings stats on mount and renders a table row + dashboard card per landing", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    // table shows the numbers + a conversion %
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
    // a dashboard card per landing (cards carry a stable testid)
    expect(screen.getAllByTestId(/^stat-card-/)).toHaveLength(2);
    // first fetch is to the stats endpoint
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/admin/stats");
  });

  it("refetches with landingId when a specific landing is selected", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    fetchMock.mockClear();
    await userEvent.selectOptions(screen.getByLabelText("Landing"), "l2");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("landingId=l2");
  });

  it("refetches with a from= bound when a preset range is chosen", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    fetchMock.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("from=");
  });
});
