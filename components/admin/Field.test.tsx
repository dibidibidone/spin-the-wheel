import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "@/components/admin/Field";

describe("Field", () => {
  it("renders a labelled input and emits string changes", async () => {
    const onChange = vi.fn();
    render(<Field label="Heading" value="Hi" onChange={onChange} />);
    const input = screen.getByLabelText("Heading");
    expect(input).toHaveValue("Hi");
    await userEvent.type(input, "!");
    expect(onChange).toHaveBeenLastCalledWith("Hi!");
  });

  it("renders a textarea when asked", () => {
    render(<Field label="Subtitle" value="x" onChange={() => {}} textarea />);
    expect(screen.getByLabelText("Subtitle").tagName).toBe("TEXTAREA");
  });
});
