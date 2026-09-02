import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, loading: authLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dietaryPattern, setDietaryPattern] = useState("OMNIVORE");
  const [customDietaryPattern, setCustomDietaryPattern] = useState("");
  if (authLoading) return <div className="min-h-screen animate-pulse bg-canvas" />;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else {
        const signedIn = await register(name, email, password, dietaryPattern, customDietaryPattern);
        if (!signedIn) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
      }
      navigate("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) throw resetError;
      setError("Password reset instructions have been sent to your email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send password reset email");
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
            {!isSupabaseConfigured && <p role="alert" className="rounded-xl bg-[#fff6e8] p-3 text-sm leading-5 text-warning">Authentication is not configured locally. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>.</p>}
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
                  disabled={loading || !isSupabaseConfigured}
                  onClick={() => void requestPasswordReset()}
                  className="font-semibold text-ink hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {error && (
              <p
                className={`${error.includes("sent") || error.includes("Check your email") ? "bg-[#ebfaef] text-[#218c49]" : "bg-red-50 text-red-600"} rounded-xl p-3 text-sm`}
              >
                {error}
              </p>
            )}
            <PillButton disabled={loading || !isSupabaseConfigured} className="w-full bg-ink text-white">
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

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setHasRecoverySession(true);
      setCheckingSession(false);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <p className="animate-pulse text-sm font-semibold text-muted">Checking reset link…</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-xl">
        <BrandLogo className="text-xl" markClassName="size-10" />
        <h1 className="mt-8 text-3xl font-bold tracking-[-0.04em] text-ink">Set a new password</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {hasRecoverySession
            ? "Choose a new password for your Circle Health account."
            : "This reset link is invalid or has expired. Request a new one from the sign-in page."}
        </p>

        {hasRecoverySession ? (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <FormField label="New password">
              <input required minLength={8} type="password" className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} />
            </FormField>
            <FormField label="Confirm new password">
              <input required minLength={8} type="password" className={inputClass} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </FormField>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            <PillButton disabled={loading} className="w-full bg-ink text-white">
              {loading ? "Updating…" : "Update password"}
              <ArrowRight size={16} />
            </PillButton>
          </form>
        ) : (
          <Link className="mt-6 inline-flex font-bold text-violet hover:underline" to="/login">
            Return to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const completeAuthentication = async () => {
      const current = await supabase.auth.getSession();
      if (current.error) throw current.error;
      if (current.data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const exchanged = await supabase.auth.exchangeCodeForSession(code);
        if (exchanged.error) throw exchanged.error;
        navigate("/dashboard", { replace: true });
        return;
      }

      throw new Error("The confirmation link is invalid or has expired. Please sign in again.");
    };

    void completeAuthentication().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Unable to confirm your account");
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-5">
        <div className="max-w-md rounded-3xl bg-surface p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-ink">Unable to finish signing in</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
          <Link className="mt-6 inline-flex font-bold text-violet hover:underline" to="/login">
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <p className="animate-pulse text-sm font-semibold text-muted">Confirming your account…</p>
    </div>
  );
}
