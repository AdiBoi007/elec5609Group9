// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../context/auth", () => ({ useAuth: () => ({ user: null, loading: false, login: vi.fn(), register: vi.fn() }) }));
vi.mock("../lib/supabase", () => ({ isSupabaseConfigured: true, supabase: { auth: { resetPasswordForEmail: vi.fn() } } }));

import { AuthPage } from "./AuthPages";

describe("registration consent", () => {
  afterEach(() => cleanup());

  it("keeps Create account disabled until the privacy checkbox is ticked", () => {
    render(<MemoryRouter><AuthPage mode="register" /></MemoryRouter>);
    const submit = screen.getByRole("button", { name: /Create account/ }) as HTMLButtonElement;
    const consent = screen.getByRole("checkbox", { name: /I agree to Circle Health storing the health information I enter/ });

    expect(submit.disabled).toBe(true);
    expect(screen.getAllByRole("link", { name: "Privacy Policy" }).every((link) => link.getAttribute("href") === "/privacy")).toBe(true);

    fireEvent.click(consent);
    expect(submit.disabled).toBe(false);
  });

  it("does not ask for consent on the sign-in form", () => {
    render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>);
    expect(screen.queryByRole("checkbox", { name: /I agree/ })).toBeNull();
    expect((screen.getByRole("button", { name: /Sign in/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");
  });
});
