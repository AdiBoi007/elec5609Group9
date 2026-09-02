// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../context/auth", () => ({ useAuth: () => ({ user: { name: "Test User", email: "test@example.com" }, logout: vi.fn() }) }));
vi.mock("../context/theme", () => ({ useTheme: () => ({ resolved: "light", setMode: vi.fn() }) }));
vi.mock("../services/api", () => ({ api: { getNotifications: vi.fn().mockResolvedValue({ unreadCount: 0, notifications: [] }), getProfile: vi.fn().mockResolvedValue({ name: "Test User", email: "test@example.com", age: 30, gender: "X", height: 170, weight: 70, activityLevel: "ACTIVE", fitnessGoal: "MAINTAIN" }), readAllNotifications: vi.fn(), readNotification: vi.fn(), addWater: vi.fn() } }));

import { AppShell } from "./AppShell";

const finalDestinations = ["Dashboard", "Log", "Progress", "Food Library", "Meal Planner", "Exercise Library", "Circle AI", "Settings"];
const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
};

describe("application shell", () => {
  beforeEach(() => { vi.stubGlobal("localStorage", memoryStorage()); vi.stubGlobal("sessionStorage", memoryStorage()); });
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
});
