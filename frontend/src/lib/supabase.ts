import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isPreviewMode = import.meta.env.DEV && !isSupabaseConfigured;

// Keep the public auth screen renderable when a developer has not configured
// local credentials. Auth actions remain disabled and no fake session is used.
export const supabase = createClient(
  supabaseUrl || "http://127.0.0.1:1",
  supabaseKey || "missing-local-supabase-key",
);
