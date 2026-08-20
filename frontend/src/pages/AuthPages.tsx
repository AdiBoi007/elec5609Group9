import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FormField, inputClass, PillButton } from "../components/ui";
import { useAuth } from "../context/auth";
import { BrandLogo } from "../components/BrandLogo";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("Adhiraj Dogra");
  const [email, setEmail] = useState("adhiraj@example.com");
  const [password, setPassword] = useState("password123");
  const [dietaryPattern, setDietaryPattern] = useState("OMNIVORE");
  const [customDietaryPattern, setCustomDietaryPattern] = useState("");
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password, dietaryPattern, customDietaryPattern);
      navigate("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#f7f7f4] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-ink p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 size-[420px] rounded-full bg-violet/30 blur-[90px]" />
        <div className="absolute -bottom-20 -left-10 size-[360px] rounded-full bg-coral/20 blur-[90px]" />
        <BrandLogo className="relative text-xl text-white" markClassName="size-11" />
        <div className="relative max-w-xl">
          <span className="mb-7 grid size-14 place-items-center rounded-2xl bg-white/10">
            <Sparkles />
          </span>
          <h1 className="text-[56px] font-bold leading-[1.02] tracking-[-0.055em]">
            Health feels better when it all connects.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/55">
            Bring training, nutrition, recovery, and progress together in one
            calm, intelligent workspace.
          </p>
          <div className="mt-10 flex gap-8">
            {[
              ["7 days", "current streak"],
              ["92%", "plan adherence"],
              ["4", "workouts this week"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/30">
          Built for sustainable progress, not perfection.
        </p>
      </div>
      <div className="flex items-center justify-center px-5 py-12 md:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-12 inline-flex text-xl text-ink lg:hidden">
            <BrandLogo markClassName="size-10" />
          </Link>
          <p className="text-sm font-semibold text-violet">
            {mode === "login" ? "Welcome back" : "Start your journey"}
          </p>
          <h2 className="mt-3 text-[42px] font-bold leading-none tracking-[-0.05em] text-ink">
            {mode === "login" ? "Sign in to Circle Health" : "Create your account"}
          </h2>
          <p className="mt-4 text-muted">
            {mode === "login"
              ? "Your next healthy choice starts here."
              : "Your personalised health workspace is a minute away."}
          </p>
          <form onSubmit={submit} className="mt-9 space-y-5">
            {mode === "register" && (
              <><FormField label="Full name">
                <input
                  required
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField><FormField label="Dietary pattern"><select required className={inputClass} value={dietaryPattern} onChange={event=>setDietaryPattern(event.target.value)}><option value="OMNIVORE">Omnivore / Non-Vegetarian</option><option value="VEGETARIAN">Vegetarian</option><option value="VEGAN">Vegan</option><option value="PESCATARIAN">Pescatarian</option><option value="EGGETARIAN">Eggetarian</option><option value="FLEXITARIAN">Flexitarian</option><option value="CUSTOM">Other / Custom</option></select></FormField>{dietaryPattern==="CUSTOM"&&<FormField label="Describe your dietary pattern"><input required maxLength={200} className={inputClass} value={customDietaryPattern} onChange={event=>setCustomDietaryPattern(event.target.value)} placeholder="A short description"/></FormField>}</>
            )}
            <FormField label="Email address">
              <input
                required
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Password">
              <input
                required
                minLength={8}
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="accent-black"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Password reset instructions have been sent to your email.",
                    )
                  }
                  className="font-semibold text-ink hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {error && (
              <p
                className={`${error.includes("sent") ? "bg-[#ebfaef] text-[#218c49]" : "bg-red-50 text-red-600"} rounded-xl p-3 text-sm`}
              >
                {error}
              </p>
            )}
            <PillButton disabled={loading} className="w-full bg-ink text-white">
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              <ArrowRight size={16} />
            </PillButton>
          </form>
          <p className="mt-7 text-center text-sm text-muted">
            {mode === "login" ? "New to Circle Health?" : "Already have an account?"}{" "}
            <Link
              className="font-bold text-ink hover:underline"
              to={mode === "login" ? "/register" : "/login"}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </Link>
          </p>
          {mode === "register" && (
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-black/[0.06] pt-7 text-center text-[10px] font-semibold text-muted">
              {[
                [ShieldCheck, "Private"],
                [Activity, "Personalised"],
                [CheckCircle2, "Simple"],
              ].map(([Icon, label]) => {
                const C = Icon as typeof Activity;
                return (
                  <div key={label as string}>
                    <C className="mx-auto mb-1" size={16} />
                    {label as string}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
