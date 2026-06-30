import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const beaconEvent = vi.fn();
vi.mock("@/lib/track", () => ({ beaconEvent: (t: string) => beaconEvent(t) }));

import { VisitBeacon } from "./VisitBeacon";

beforeEach(() => beaconEvent.mockReset());

describe("VisitBeacon", () => {
  it("fires a single visit beacon on mount and renders nothing", () => {
    const { container } = render(<VisitBeacon />);
    expect(beaconEvent).toHaveBeenCalledTimes(1);
    expect(beaconEvent).toHaveBeenCalledWith("visit");
    expect(container.firstChild).toBeNull();
  });
});
