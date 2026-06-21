import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createLandingReq = vi.fn();
vi.mock("@/lib/adminClient", () => ({ createLandingReq: (...a: unknown[]) => createLandingReq(...a) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { NewLandingButton } from "@/components/admin/NewLandingButton";

beforeEach(() => {
  createLandingReq.mockReset();
  push.mockReset();
});

describe("NewLandingButton", () => {
  it("creates a landing and navigates to its editor", async () => {
    createLandingReq.mockResolvedValue({ id: "new1" });
    render(<NewLandingButton />);
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "Summer Promo");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createLandingReq).toHaveBeenCalledWith({ name: "Summer Promo" });
    expect(push).toHaveBeenCalledWith("/admin/landings/new1");
  });

  it("does nothing when the name is blank", async () => {
    render(<NewLandingButton />);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(createLandingReq).not.toHaveBeenCalled();
  });
});
