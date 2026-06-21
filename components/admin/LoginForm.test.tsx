import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { LoginForm } from "@/components/admin/LoginForm";

beforeEach(() => {
  signIn.mockReset();
  push.mockReset();
});

describe("LoginForm", () => {
  it("signs in and routes to the dashboard on success", async () => {
    signIn.mockResolvedValue({ ok: true, error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("credentials", { email: "admin@x.com", password: "pw", redirect: false });
    expect(push).toHaveBeenCalledWith("/admin");
  });

  it("shows an error and does not route on failure", async () => {
    signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
