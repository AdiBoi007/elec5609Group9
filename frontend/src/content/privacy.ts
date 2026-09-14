/**
 * Single source for privacy wording shared by the Privacy Policy page, the consent
 * prompts and the AI notices, so they cannot drift apart.
 *
 * The version constants must match backend `com.pulse.config.PrivacyVersions`.
 * Bump a version whenever the matching wording changes materially: every user is
 * then asked to agree again.
 */
export const PRIVACY_NOTICE_VERSION = "2026-09-13";
export const AI_NOTICE_VERSION = "2026-09-13";

export const PRIVACY_CONTACT_EMAIL = "circle.health.elec5619@gmail.com";

export type AiDataUse = {
  feature: string;
  sent: string;
  note?: string;
};

/** What each AI feature sends to OpenAI. Keep in step with the backend services that build the requests. */
export const AI_DATA_USES: AiDataUse[] = [
  {
    feature: "Ask Circle",
    sent: "Your question, earlier messages in the same conversation, today's nutrition and hydration totals, this week's workout, nutrition, hydration and sleep summary, your recovery score, and your active goals.",
  },
  {
    feature: "AI meal plan",
    sent: "Your calorie and macro targets, meals per day, dietary pattern, restrictions, allergies, intolerances, cultural preferences, disliked foods, and preferred cuisines and protein sources.",
  },
  {
    feature: "AI workout plan",
    sent: "Your goal, experience level, days per week, session length, available equipment, and any preferences you type.",
  },
  {
    feature: "Weekly insights",
    sent: "Your age, goal, activity level and targets, your dietary profile, and the last 14 days of workouts and meals (including their names), water, sleep and body measurements.",
    note: "Not currently offered in the app.",
  },
];

export type Processor = {
  name: string;
  purpose: string;
  location: string;
};

export const PROCESSORS: Processor[] = [
  { name: "Supabase", purpose: "Sign-in and the database that stores your account and health records", location: "Singapore" },
  { name: "Render", purpose: "Runs the Circle Health server", location: "Singapore" },
  { name: "Vercel", purpose: "Serves the Circle Health website", location: "Global network" },
  { name: "OpenAI", purpose: "Generates AI answers and plans, only if you allow AI features", location: "United States" },
  { name: "Open Food Facts", purpose: "Looks up products when you scan a barcode; only the barcode number is sent", location: "France" },
  { name: "YouTube", purpose: "Plays exercise demonstration videos in privacy-enhanced mode when you open one", location: "United States" },
];
