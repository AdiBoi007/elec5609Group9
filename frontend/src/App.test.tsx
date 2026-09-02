// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("./context/auth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("./lib/supabase", () => ({ supabase: { auth: { getSession: vi.fn(), signOut: vi.fn() } } }));

import { LegacyRedirect } from "./App";

function LocationProbe() {
  const location = useLocation();
  return <output>{location.pathname}{location.search}</output>;
}

describe("legacy route migration", () => {
  it("redirects the old water page into the consolidated Log tab", async () => {
    render(<MemoryRouter initialEntries={["/water"]}><Routes><Route path="/water" element={<LegacyRedirect to="/log?tab=water"/>}/><Route path="/log" element={<LocationProbe/>}/></Routes></MemoryRouter>);
    expect(await screen.findByText("/log?tab=water")).toBeTruthy();
  });

  it("preserves a legacy query when the destination has no fixed query", async () => {
    render(<MemoryRouter initialEntries={["/plans?source=bookmark"]}><Routes><Route path="/plans" element={<LegacyRedirect to="/meal-planner"/>}/><Route path="/meal-planner" element={<LocationProbe/>}/></Routes></MemoryRouter>);
    expect(await screen.findByText("/meal-planner?source=bookmark")).toBeTruthy();
  });
});
