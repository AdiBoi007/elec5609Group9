// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_NOTICE_VERSION } from "../content/privacy";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  grantAiConsent: vi.fn(),
  revokeAiConsent: vi.fn(),
  getReminders: vi.fn(),
  deleteAllConversations: vi.fn(),
}));

vi.mock("../services/api", () => ({ api: mocks }));
vi.mock("../context/theme", () => ({ useTheme: () => ({ mode: "light", resolved: "light", setMode: vi.fn() }) }));

import { useAiConsent } from "../hooks/useAiConsent";
import { AiNotice } from "./AiConsent";
import SettingsPage from "../pages/SettingsPage";

const status = (aiConsentAt: string | null) => ({
  currentNoticeVersion: "2026-09-13", acceptedNoticeVersion: "2026-09-13", acceptedAt: "2026-09-13T00:00:00Z",
  currentAiVersion: AI_NOTICE_VERSION, aiConsentVersion: aiConsentAt ? AI_NOTICE_VERSION : null, aiConsentAt,
});
const profile = (aiConsentAt: string | null) => ({ name: "Test User", email: "test@example.com", age: 30, gender: "Male", height: 170, weight: 70, activityLevel: "Moderately active", fitnessGoal: "MAINTAIN", privacy: status(aiConsentAt) });

const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
};

/** Stands in for a page: pressing Generate asks for consent and then records whether the request went ahead. */
function Harness() {
  const consent = useAiConsent();
  const [outcomes, setOutcomes] = useState<string[]>([]);
  return (
    <MemoryRouter>
      <button type="button" onClick={async () => { const proceed = await consent.confirm("mealPlan"); setOutcomes((current) => [...current, proceed ? "sent" : "cancelled"]); }}>Generate</button>
      <output data-testid="outcomes">{outcomes.join(",")}</output>
      <AiNotice consent={consent} feature="mealPlan" />
      {consent.dialog}
    </MemoryRouter>
  );
}

const outcomes = () => screen.getByTestId("outcomes").textContent;

describe("AI consent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.clearAllMocks();
    mocks.getReminders.mockResolvedValue([]);
  });
  afterEach(() => cleanup());

  it("asks before the first request and sends it after the user allows AI", async () => {
    mocks.getProfile.mockResolvedValue(profile(null));
    mocks.grantAiConsent.mockResolvedValue(status("2026-09-14T01:00:00Z"));
    render(<Harness />);

    expect(await screen.findByText(/AI is off, so this uses Circle Health's built-in templates/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const dialog = await screen.findByRole("dialog", { name: "Use AI features?" });
    expect(dialog.textContent).toContain("AI meal plan sends");
    expect(dialog.textContent).toContain("OpenAI");
    expect(dialog.textContent).toContain("Your name, email and account ID are never included");
    expect(outcomes()).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Allow AI features/ }));
    await waitFor(() => expect(outcomes()).toBe("sent"));
    expect(mocks.grantAiConsent).toHaveBeenCalledWith(AI_NOTICE_VERSION);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Sends your targets and dietary profile/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(outcomes()).toBe("sent,sent"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not ask a user who already allowed AI", async () => {
    mocks.getProfile.mockResolvedValue(profile("2026-09-14T01:00:00Z"));
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(outcomes()).toBe("sent"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("continues without AI and stops asking for the rest of the session", async () => {
    mocks.getProfile.mockResolvedValue(profile(null));
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue without AI" }));
    await waitFor(() => expect(outcomes()).toBe("sent"));
    expect(mocks.grantAiConsent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(outcomes()).toBe("sent,sent"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels the request when the dialog is closed without a choice", async () => {
    mocks.getProfile.mockResolvedValue(profile(null));
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() => expect(outcomes()).toBe("cancelled"));
  });

  it("lets Settings turn AI on through the dialog and off directly", async () => {
    mocks.getProfile.mockResolvedValue(profile(null));
    mocks.grantAiConsent.mockResolvedValue(status("2026-09-14T01:00:00Z"));
    mocks.revokeAiConsent.mockResolvedValue(undefined);
    render(<MemoryRouter initialEntries={["/settings?section=Data"]}><SettingsPage /></MemoryRouter>);

    const toggle = await screen.findByRole("switch", { name: "AI features" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);
    expect(await screen.findByRole("button", { name: "Not now" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Allow AI features/ }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "AI features" }).getAttribute("aria-checked")).toBe("true"));
    expect(mocks.grantAiConsent).toHaveBeenCalledWith(AI_NOTICE_VERSION);

    fireEvent.click(screen.getByRole("switch", { name: "AI features" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "AI features" }).getAttribute("aria-checked")).toBe("false"));
    expect(mocks.revokeAiConsent).toHaveBeenCalled();
  });
});
