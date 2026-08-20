import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./auth";
import { api } from "../services/api";
import type { User } from "../types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const value = localStorage.getItem("pulse_user");
    return value ? JSON.parse(value) : null;
  });

  const setSession = (data: { token: string; name: string; email: string }) => {
    localStorage.setItem("pulse_token", data.token);
    localStorage.setItem(
      "pulse_user",
      JSON.stringify({ name: data.name, email: data.email }),
    );
    setUser({ name: data.name, email: data.email });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (email, password) => {
        try {
          setSession(await api.login(email, password));
        } catch (error) {
          if (!(error instanceof TypeError)) throw error;
          // Demo fallback keeps the frontend usable while the API is offline.
          setSession({ token: "demo-token", name: "Adhiraj Dogra", email });
        }
      },
      register: async (name, email, password, dietaryPattern, customDietaryPattern) => {
        try {
          setSession(await api.register(name, email, password, dietaryPattern, customDietaryPattern));
        } catch (error) {
          if (!(error instanceof TypeError)) throw error;
          setSession({ token: "demo-token", name, email });
        }
      },
      logout: () => {
        localStorage.removeItem("pulse_token");
        localStorage.removeItem("pulse_user");
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
