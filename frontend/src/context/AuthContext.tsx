import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "./auth";
import { api } from "../services/api";
import { isPreviewMode, supabase } from "../lib/supabase";
import type { User } from "../types";

const appUser = (user: SupabaseUser | null): User | null => {
  if (!user?.email) return null;
  const metadataName = user.user_metadata.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : user.email.split("@")[0];
  return { name, email: user.email };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setUser({ name: "Adhiraj Dogra", email: "adhiraj@example.com" });
      setLoading(false);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(appUser(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(appUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(appUser(data.user));
      },
      register: async (name, email, password, dietaryPattern, customDietaryPattern) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { name, dietaryPattern, customDietaryPattern },
          },
        });
        if (error) throw error;
        setUser(appUser(data.session?.user ?? null));

        if (data.session) {
          await api.updateProfile({
            dietaryProfile: {
              dietaryPattern: dietaryPattern as "OMNIVORE" | "VEGETARIAN" | "VEGAN" | "PESCATARIAN" | "EGGETARIAN" | "FLEXITARIAN" | "CUSTOM",
              customDietaryPattern: customDietaryPattern ?? "",
              restrictions: [],
              customExclusions: [],
              culturalPreferences: [],
              customCulturalPreferences: [],
              allergies: [],
              customAllergies: [],
              intolerances: [],
              customIntolerances: [],
              favouriteFoods: [],
              dislikedFoods: [],
              preferredCuisines: [],
              preferredProteinSources: [],
              customProteinSources: [],
              preferredMealsPerDay: 3,
              mealPrepDifficulty: "EASY",
              mealPrepTime: "MIN_15_30",
              budgetPreference: "MODERATE",
            },
          });
        }
        return Boolean(data.session);
      },
      logout: async () => {
        if (isPreviewMode) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
