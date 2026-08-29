import { useState } from "react";
import { Modal, FormField, inputClass, PillButton } from "./ui";
import { api } from "../services/api";
import { FITNESS_GOALS, type UserProfile } from "../types";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const ACTIVITY_LEVELS = ["Lightly active", "Moderately active", "Very active"];

/**
 * One-time guided setup shown after the first login. Collects the six
 * measurements that personalise nutrition targets so the user does not have to
 * discover the Settings page on their own.
 */
export function OnboardingModal({
  profile,
  onComplete,
  onSkip,
}: {
  profile: UserProfile;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [form, setForm] = useState({
    age: profile.age > 0 ? String(profile.age) : "",
    gender: profile.gender || "",
    height: profile.height > 0 ? String(profile.height) : "",
    weight: profile.weight > 0 ? String(profile.weight) : "",
    activityLevel: profile.activityLevel || "",
    fitnessGoal: profile.fitnessGoal || "MAINTAIN",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const age = Number(form.age);
  const height = Number(form.height);
  const weight = Number(form.weight);
  const valid =
    age >= 13 &&
    age <= 120 &&
    !!form.gender &&
    height >= 80 &&
    height <= 250 &&
    weight >= 25 &&
    weight <= 500 &&
    !!form.activityLevel &&
    !!form.fitnessGoal;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.updateProfile({
        age,
        gender: form.gender,
        height,
        weight,
        activityLevel: form.activityLevel,
        fitnessGoal: form.fitnessGoal,
      });
      onComplete();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save your profile",
      );
      setSaving(false);
    }
  };

  return (
    <Modal title="Set up your profile" onClose={onSkip}>
      <p className="-mt-3 mb-6 text-sm leading-6 text-muted">
        We use these details to personalise your calorie and macro targets.
        Until you complete them, the app shows generic default targets.
      </p>
      {error && (
        <p className="mb-4 rounded-xl bg-[#fff1ef] p-3 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Age">
          <input
            type="number"
            min={13}
            max={120}
            className={inputClass}
            value={form.age}
            onChange={(event) => setForm({ ...form, age: event.target.value })}
          />
        </FormField>
        <FormField label="Gender">
          <select
            className={inputClass}
            value={form.gender}
            onChange={(event) =>
              setForm({ ...form, gender: event.target.value })
            }
          >
            <option value="" disabled>
              Select…
            </option>
            {GENDERS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Height (cm)">
          <input
            type="number"
            min={80}
            max={250}
            className={inputClass}
            value={form.height}
            onChange={(event) =>
              setForm({ ...form, height: event.target.value })
            }
          />
        </FormField>
        <FormField label="Weight (kg)">
          <input
            type="number"
            min={25}
            max={500}
            className={inputClass}
            value={form.weight}
            onChange={(event) =>
              setForm({ ...form, weight: event.target.value })
            }
          />
        </FormField>
        <FormField label="Activity level">
          <select
            className={inputClass}
            value={form.activityLevel}
            onChange={(event) =>
              setForm({ ...form, activityLevel: event.target.value })
            }
          >
            <option value="" disabled>
              Select…
            </option>
            {ACTIVITY_LEVELS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Fitness goal">
          <select
            className={inputClass}
            value={form.fitnessGoal}
            onChange={(event) =>
              setForm({ ...form, fitnessGoal: event.target.value })
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
      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-semibold text-muted transition hover:text-ink"
        >
          I'll do this later
        </button>
        <PillButton
          onClick={() => void submit()}
          disabled={!valid || saving}
          className="bg-ink text-white"
        >
          {saving ? "Saving…" : "Save and personalise"}
        </PillButton>
      </div>
    </Modal>
  );
}
