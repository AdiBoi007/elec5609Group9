import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CircleHelp,
  Download,
  Monitor,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  Target,
  UserRound,
  Utensils,
} from "lucide-react";
import {
  Card,
  FormField,
  inputClass,
  MetricItem,
  MetricStrip,
  PageHeader,
  PillButton,
  SectionHeader,
} from "../components/ui";
import { DietaryPreferencesEditor } from "../components/DietaryPreferencesEditor";
import { api } from "../services/api";
import type { UserProfile } from "../types";
import { FITNESS_GOALS, fitnessGoalLabel, isProfileComplete } from "../types";
import { useTheme, type ThemeMode } from "../context/theme";

const sections = [
  { id: "Profile", description: "Personal details", icon: UserRound },
  { id: "Diet", description: "Preferences and exclusions", icon: Utensils },
  { id: "Targets", description: "Calculated health goals", icon: Target },
  { id: "Notifications", description: "Reminder schedule", icon: Bell },
  { id: "Appearance", description: "Light, dark or system", icon: Palette },
  { id: "Data", description: "Export your records", icon: Download },
  { id: "Help", description: "Product guide and methods", icon: CircleHelp },
] as const;
type Section = (typeof sections)[number]["id"];
type ReminderKey = "workouts" | "meals" | "water" | "weigh-in" | "sleep";

export default function SettingsPage() {
  const { mode, resolved, setMode } = useTheme();
  const [section, setSection] = useState<Section>("Profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    age: 0,
    gender: "Male",
    height: 0,
    weight: 0,
    activityLevel: "Moderately active",
    fitnessGoal: "MAINTAIN",
  });
  const [notifications, setNotifications] = useState<
    Record<ReminderKey, boolean>
  >({
    workouts: true,
    meals: false,
    water: true,
    "weigh-in": true,
    sleep: true,
  });
  const [details, setDetails] = useState<
    Record<string, { time: string; days: string }>
  >({});
  useEffect(() => {
    Promise.all([api.getProfile(), api.getReminders()])
      .then(([profileData, reminders]) => {
        setProfile(profileData);
        if (reminders.length) {
          setNotifications((current) => {
            const next = { ...current };
            reminders.forEach((reminder) => {
              if (reminder.type in next)
                next[reminder.type as ReminderKey] = reminder.enabled;
            });
            return next;
          });
          setDetails(
            Object.fromEntries(
              reminders.map((item) => [
                item.type,
                {
                  time: item.reminderTime?.slice(0, 5) || "09:00",
                  days: item.daysOfWeek || "EVERYDAY",
                },
              ]),
            ),
          );
        }
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load settings",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  const saveProfile = async () => {
    setError("");
    if (!profile.name.trim()) return setError("Name is required.");
    if (profile.age < 13 || profile.age > 120)
      return setError("Age must be between 13 and 120.");
    if (profile.height < 80 || profile.height > 250)
      return setError("Height must be between 80 and 250 cm.");
    if (profile.weight < 25 || profile.weight > 500)
      return setError("Weight must be between 25 and 500 kg.");
    if (!profile.dietaryProfile?.dietaryPattern)
      return setError("Choose a dietary pattern in Diet settings.");
    if (
      profile.dietaryProfile.dietaryPattern === "CUSTOM" &&
      !profile.dietaryProfile.customDietaryPattern.trim()
    )
      return setError("Describe your custom dietary pattern.");
    setSaving(true);
    try {
      await api.updateProfile({ ...profile, name: profile.name.trim() });
      setProfile(await api.getProfile());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save profile",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateReminder = async (key: ReminderKey, enabled: boolean) => {
    setNotifications((current) => ({ ...current, [key]: enabled }));
    try {
      await api.updateReminder(
        key,
        enabled,
        details[key]?.time,
        details[key]?.days,
      );
    } catch (reason) {
      setNotifications((current) => ({ ...current, [key]: !enabled }));
      setError(
        reason instanceof Error ? reason.message : "Unable to update reminder",
      );
    }
  };
  const saveReminderDetail = async (
    key: ReminderKey,
    time: string,
    days: string,
  ) => {
    try {
      await api.updateReminder(key, notifications[key], time, days);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update reminder",
      );
    }
  };
  const download = async () => {
    setError("");
    try {
      const csv = await api.exportProfile();
      const url = URL.createObjectURL(csv);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "circle-health-data.csv";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to export your data",
      );
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, targets, preferences and reminders."
      />
      {error && (
        <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      {loading ? (
        <div className="h-80 animate-pulse rounded-card bg-white" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <Card className="h-fit p-2 lg:sticky lg:top-[84px]">
            {sections.map(({ id, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${section === id ? "bg-ink text-white" : "hover:bg-[#f4f4f1]"}`}
              >
                <Icon size={17} />
                <span>
                  <span className="block text-sm font-semibold">{id}</span>
                  <span
                    className={`block text-[10px] ${section === id ? "text-white/50" : "text-muted"}`}
                  >
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </Card>
          <div className="min-w-0">
            {section === "Profile" && (
              <Card className="p-5 md:p-6">
                <SectionHeader
                  title="Your profile"
                  description="Used to calculate consistent targets across Circle Health"
                />
                <div className="mt-5 flex items-center gap-4 rounded-[18px] bg-ink p-4 text-white">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-coral text-sm font-bold">
                    {profile.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{profile.name}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {fitnessGoalLabel(profile.fitnessGoal)} · {profile.activityLevel}
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {profile.weight.toFixed(1)}{" "}
                    <span className="text-xs text-white/40">kg</span>
                  </p>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FormField label="Name">
                    <input
                      className={inputClass}
                      value={profile.name}
                      onChange={(event) =>
                        setProfile({ ...profile, name: event.target.value })
                      }
                    />
                  </FormField>
                  {[
                    ["Age", "age"],
                    ["Height (cm)", "height"],
                    ["Weight (kg)", "weight"],
                  ].map(([label, key]) => (
                    <FormField key={key} label={label}>
                      <input
                        type="number"
                        min={key === "age" ? 13 : key === "height" ? 80 : 25}
                        max={key === "age" ? 120 : key === "height" ? 250 : 500}
                        step={key === "age" ? 1 : 0.1}
                        className={inputClass}
                        value={profile[key as "age" | "height" | "weight"]}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            [key]: Number(event.target.value),
                          })
                        }
                      />
                    </FormField>
                  ))}
                  <FormField label="Gender">
                    <select
                      className={inputClass}
                      value={profile.gender}
                      onChange={(event) =>
                        setProfile({ ...profile, gender: event.target.value })
                      }
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                      <option>Prefer not to say</option>
                    </select>
                  </FormField>
                  <FormField label="Activity level">
                    <select
                      className={inputClass}
                      value={profile.activityLevel}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          activityLevel: event.target.value,
                        })
                      }
                    >
                      <option>Lightly active</option>
                      <option>Moderately active</option>
                      <option>Very active</option>
                    </select>
                  </FormField>
                  <FormField label="Fitness goal">
                    <select
                      className={inputClass}
                      value={profile.fitnessGoal}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          fitnessGoal: event.target.value,
                        })
                      }
                    >
                      {FITNESS_GOALS.map((goal) => (
                        <option key={goal.value} value={goal.value}>
                          {goal.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <PillButton
                  onClick={() => void saveProfile()}
                  disabled={saving}
                  className="mt-5 bg-ink text-white"
                >
                  {saved ? (
                    <>
                      <Check size={16} />
                      Saved
                    </>
                  ) : saving ? (
                    "Saving…"
                  ) : (
                    "Save changes"
                  )}
                </PillButton>
              </Card>
            )}
            {section === "Diet" && (
              <DietaryPreferencesEditor
                profile={profile}
                onChange={setProfile}
                onSave={saveProfile}
                saving={saving}
                saved={saved}
              />
            )}
            {section === "Targets" && (
              <Card className="p-5 md:p-6">
                <SectionHeader
                  title="Calculated targets"
                  description="One source of truth used by Dashboard, Nutrition and Progress"
                />
                {!isProfileComplete(profile) && (
                  <p className="mt-4 rounded-xl bg-amber/10 p-3 text-sm font-semibold text-ink">
                    These are default values. Complete your age, gender, height,
                    weight, activity level and goal in the Profile tab to
                    personalise them.
                  </p>
                )}
                <MetricStrip className="mt-5 grid-cols-2 xl:grid-cols-3">
                  <MetricItem
                    label="BMI"
                    value={profile.bmi?.toFixed(1) ?? "—"}
                    detail="Body mass index"
                    accent="bg-ink"
                  />
                  <MetricItem
                    label="BMR"
                    value={profile.bmr ? profile.bmr.toLocaleString() : "—"}
                    detail="kcal at rest"
                    accent="bg-coral"
                  />
                  <MetricItem
                    label="TDEE"
                    value={profile.tdee ? profile.tdee.toLocaleString() : "—"}
                    detail="estimated daily kcal"
                    accent="bg-amber"
                  />
                  <MetricItem
                    label="Calories"
                    value={profile.calorieTarget?.toLocaleString() ?? "—"}
                    detail="daily kcal target"
                    accent="bg-coral"
                  />
                  <MetricItem
                    label="Protein"
                    value={
                      profile.proteinTarget ? `${profile.proteinTarget}g` : "—"
                    }
                    detail="daily target"
                    accent="bg-violet"
                  />
                  <MetricItem
                    label="Hydration"
                    value={
                      profile.hydrationTargetMl
                        ? `${(profile.hydrationTargetMl / 1000).toFixed(1)}L`
                        : "—"
                    }
                    detail="daily target"
                    accent="bg-cyan"
                  />
                </MetricStrip>
                <p className="mt-5 rounded-2xl bg-[#f7f7f4] p-4 text-xs leading-5 text-muted">
                  <SlidersHorizontal size={15} className="mr-2 inline" />
                  Targets use standard BMI and Mifflin–St Jeor estimates
                  adjusted for your activity and fitness goal. Update Profile to
                  recalculate them.
                </p>
              </Card>
            )}
            {section === "Notifications" && (
              <Card className="p-5 md:p-6">
                <SectionHeader
                  title="Reminder schedule"
                  description="Changes persist as soon as you make them"
                />
                <div className="mt-4 divide-y divide-black/[0.055]">
                  {(
                    Object.entries(notifications) as [ReminderKey, boolean][]
                  ).map(([key, enabled]) => (
                    <div
                      key={key}
                      className="grid gap-3 py-4 sm:grid-cols-[1fr_130px_150px_auto] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-semibold capitalize">
                          {key}
                        </p>
                        <p className="text-xs text-muted">
                          In-app {key} reminder
                        </p>
                      </div>
                      <input
                        aria-label={`${key} reminder time`}
                        type="time"
                        className={inputClass}
                        value={details[key]?.time || "09:00"}
                        onChange={(event) =>
                          setDetails((current) => ({
                            ...current,
                            [key]: {
                              time: event.target.value,
                              days: current[key]?.days || "EVERYDAY",
                            },
                          }))
                        }
                        onBlur={(event) =>
                          void saveReminderDetail(
                            key,
                            event.target.value,
                            details[key]?.days || "EVERYDAY",
                          )
                        }
                      />
                      <select
                        aria-label={`${key} reminder recurrence`}
                        className={inputClass}
                        value={details[key]?.days || "EVERYDAY"}
                        onChange={(event) => {
                          const days = event.target.value;
                          const time = details[key]?.time || "09:00";
                          setDetails((current) => ({
                            ...current,
                            [key]: { time, days },
                          }));
                          void saveReminderDetail(key, time, days);
                        }}
                      >
                        <option value="EVERYDAY">Every day</option>
                        <option value="WEEKDAYS">Weekdays</option>
                        <option value="MON,WED,FRI">Mon, Wed, Fri</option>
                        <option value="MON">Weekly</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void updateReminder(key, !enabled)}
                        aria-label={`${enabled ? "Disable" : "Enable"} ${key} reminder`}
                        className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-ink" : "bg-[#deded8]"}`}
                      >
                        <span
                          className={`absolute top-1 size-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {section === "Appearance" && (
              <Card className="p-5 md:p-6">
                <SectionHeader title="Appearance" description="Choose how Circle Health looks on this device" />
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {([
                    ["system", "System", Monitor, "Follow this device"],
                    ["light", "Light", Sun, "Warm and bright"],
                    ["dark", "Dark", Moon, "Deep and focused"],
                  ] as const).map(([value,label,Icon,detail]) => <button key={value} type="button" onClick={()=>setMode(value as ThemeMode)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${mode===value?"border-coral bg-coral/[0.08] ring-1 ring-coral/20":"border-line bg-surface-muted hover:bg-surface-elevated"}`}><span className={`grid size-10 place-items-center rounded-xl ${mode===value?"bg-coral text-white":"bg-surface text-ink"}`}><Icon size={18}/></span><span><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-[11px] text-muted">{detail}</span></span>{mode===value&&<Check size={15} className="ml-auto text-coral"/>}</button>)}
                </div>
                <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-xs leading-5 text-muted">Currently showing <strong className="text-ink">{resolved}</strong> mode. System mode follows colour-scheme changes immediately and your preference is saved locally.</p>
              </Card>
            )}
            {section === "Data" && (
              <Card className="p-5 md:p-6">
                <SectionHeader
                  title="Your data"
                  description="Download a portable copy of your health records"
                />
                <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-[#f7f7f4] p-5 sm:flex-row sm:items-center">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white">
                    <Download size={19} />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">Circle Health data export</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Includes profile, workouts, nutrition, water, sleep,
                      measurements and trackable goals where available.
                    </p>
                  </div>
                  <PillButton
                    onClick={() => void download()}
                    className="bg-ink text-white"
                  >
                    <Download size={15} />
                    Export CSV
                  </PillButton>
                </div>
              </Card>
            )}
            {section === "Help" && (
              <Card className="p-5 md:p-6">
                <SectionHeader title="Circle Health product guide" description="A concise guide to the product and its calculations" />
                <div className="mt-5 grid gap-px overflow-hidden rounded-[20px] bg-line sm:grid-cols-2">
                  {[
                    ["Log from anywhere", "Use Quick Log in the top bar or press ⌘/Ctrl+K. The full Log page supports meals, workouts, water, sleep and body data."],
                    ["Understand today", "Dashboard totals, the daily health score, Today timeline and calendar all use the same persisted health records."],
                    ["Track outcomes", "Goals never duplicate health data. Progress is derived from your measurements, nutrition, hydration, sleep, workouts and streak."],
                    ["Ask Circle", "Answers and meal suggestions are grounded in your logged data. They are general wellness guidance, not medical advice."],
                  ].map(([title, detail]) => <div key={title} className="bg-surface p-4"><p className="text-sm font-bold text-ink">{title}</p><p className="mt-2 text-xs leading-5 text-muted">{detail}</p></div>)}
                </div>
                <div className="mt-5 rounded-2xl bg-surface-muted p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Calculation notes</p>
                  <p className="mt-2 text-xs leading-5 text-muted">Nutrition targets use the Mifflin–St Jeor estimate adjusted for activity and fitness goal. Calendar scores use transparent category thresholds. Goal projections require enough recorded trend data and remain estimates.</p>
                </div>
                <p className="mt-4 text-[11px] text-muted">Circle Health · Fitness &amp; Nutrition Planner · University project build</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
