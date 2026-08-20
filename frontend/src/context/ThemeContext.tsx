import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ThemeMode } from "./theme";

const savedMode = (): ThemeMode => {
  const value = localStorage.getItem("pulse_theme");
  return value === "light" || value === "dark" || value === "system" ? value : "system";
};
const systemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(savedMode);
  const [system, setSystem] = useState<"light" | "dark">(systemTheme);
  const resolved = mode === "system" ? system : mode;
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0e0e11" : "#f4f2ed");
  }, [resolved]);
  const value = useMemo(() => ({ mode, resolved, setMode: (next: ThemeMode) => { localStorage.setItem("pulse_theme", next); setModeState(next); } }), [mode, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
