// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  getProfile: vi.fn(),
  acceptPrivacy: vi.fn(),
}));

vi.mock("../context/auth", () => ({ useAuth: () => ({ user: { name: "Test User", email: "test@example.com" }, logout: mocks.logout }) }));
vi.mock("../context/theme", () => ({ useTheme: () => ({ resolved: "light", setMode: vi.fn() }) }));
vi.mock("../services/api", () => ({ api: { getNotifications: vi.fn().mockResolvedValue({ unreadCount: 0, notifications: [] }), getProfile: mocks.getProfile, acceptPrivacy: mocks.acceptPrivacy, readAllNotifications: vi.fn(), readNotification: vi.fn(), addWater: vi.fn() } }));

import { AppShell } from "./AppShell";
import { PRIVACY_NOTICE_VERSION } from "../content/privacy";

const completeProfile = { name: "Test User", email: "test@example.com", age: 30, gender: "X", height: 170, weight: 70, activityLevel: "ACTIVE", fitnessGoal: "MAINTAIN" };
const privacy = (accepted: string | null) => ({ currentNoticeVersion: PRIVACY_NOTICE_VERSION, acceptedNoticeVersion: accepted, acceptedAt: accepted ? "2026-09-13T00:00:00Z" : null, currentAiVersion: PRIVACY_NOTICE_VERSION, aiConsentVersion: null, aiConsentAt: null });
const renderShell = () => render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="*" element={<AppShell/>}/></Routes></MemoryRouter>);
const PRIVACY_DIALOG = "How Circle Health handles your data";

const finalDestinations = ["Dashboard", "Log", "Progress", "Food Library", "Meal Planner", "Exercise Library", "Circle AI", "Settings"];
const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
};

describe("application shell", () => {
  beforeEach(() => { vi.stubGlobal("localStorage", memoryStorage()); vi.stubGlobal("sessionStorage", memoryStorage()); vi.clearAllMocks(); mocks.getProfile.mockResolvedValue(completeProfile); mocks.logout.mockResolvedValue(undefined); });
  afterEach(() => cleanup());

  it("shows the final information architecture without legacy sidebar destinations", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="*" element={<AppShell/>}/></Routes></MemoryRouter>);
    finalDestinations.forEach((label) => expect(screen.getByRole("link", { name: label })).toBeTruthy());
    ["Goals", "Plans", "Ask Circle", "Workouts", "Nutrition", "Water", "Sleep", "Body"].forEach((label) => expect(screen.queryByRole("link", { name: label })).toBeNull());
  });

  it("opens the responsive navigation drawer", () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="*" element={<AppShell/>}/></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toBeTruthy();
  });

  it("blocks the app until an account without consent agrees to the current policy", async () => {
    mocks.getProfile.mockResolvedValue({ ...completeProfile, privacy: privacy(null) });
    mocks.acceptPrivacy.mockResolvedValue(privacy(PRIVACY_NOTICE_VERSION));
    renderShell();

    const dialog = await screen.findByRole("dialog", { name: PRIVACY_DIALOG });
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: PRIVACY_DIALOG })).toBe(dialog);
    expect(screen.getByRole("link", { name: /Review Privacy Policy/ }).getAttribute("href")).toBe("/privacy");

    fireEvent.click(screen.getByRole("button", { name: "I agree" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: PRIVACY_DIALOG })).toBeNull());
    expect(mocks.acceptPrivacy).toHaveBeenCalledWith(PRIVACY_NOTICE_VERSION);
  });

  it("shows onboarding after agreeing when the profile is incomplete", async () => {
    mocks.getProfile.mockResolvedValue({ ...completeProfile, age: 0, privacy: privacy("2000-01-01") });
    mocks.acceptPrivacy.mockResolvedValue(privacy(PRIVACY_NOTICE_VERSION));
    renderShell();

    expect(screen.queryByRole("dialog", { name: "Set up your profile" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "I agree" }));
    expect(await screen.findByRole("dialog", { name: "Set up your profile" })).toBeTruthy();
  });

  it("does not ask again once the current version is accepted", async () => {
    mocks.getProfile.mockResolvedValue({ ...completeProfile, privacy: privacy(PRIVACY_NOTICE_VERSION) });
    renderShell();

    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByRole("dialog", { name: PRIVACY_DIALOG })).toBeNull();
  });

  it("lets a user who does not agree sign out", async () => {
    mocks.getProfile.mockResolvedValue({ ...completeProfile, privacy: privacy(null) });
    renderShell();

    const dialog = await screen.findByRole("dialog", { name: PRIVACY_DIALOG });
    fireEvent.click(Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent?.includes("Sign out"))!);
    expect(mocks.logout).toHaveBeenCalled();
    expect(mocks.acceptPrivacy).not.toHaveBeenCalled();
  });
});
