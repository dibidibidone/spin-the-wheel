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
  it("creates a landing with the default template and navigates to its editor", async () => {
    createLandingReq.mockResolvedValue({ id: "new1" });
    render(<NewLandingButton />);
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "Summer Promo");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createLandingReq).toHaveBeenCalledWith({ name: "Summer Promo", template: "classic-2d" });
    expect(push).toHaveBeenCalledWith("/admin/landings/new1");
  });

  it("creates with the chosen template", async () => {
    createLandingReq.mockResolvedValue({ id: "new3" });
    render(<NewLandingButton />);
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "Slot Promo");
    await userEvent.selectOptions(screen.getByLabelText("Template"), "gates-of-olympus");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createLandingReq).toHaveBeenCalledWith({ name: "Slot Promo", template: "gates-of-olympus" });
  });

  it("does nothing when the name is blank", async () => {
    render(<NewLandingButton />);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(createLandingReq).not.toHaveBeenCalled();
  });

  it("disables Create until a non-blank name is entered", async () => {
    render(<NewLandingButton />);
    const btn = screen.getByRole("button", { name: "Create" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "   ");
    expect(btn.disabled).toBe(true); // whitespace-only is still blank
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "Summer");
    expect(btn.disabled).toBe(false);
  });
});
