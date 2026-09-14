import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, ShieldCheck, Sparkles, X } from "lucide-react";
import { Modal, PillButton } from "./ui";
import { AI_DATA_USES, aiDataUse, type AiFeature } from "../content/privacy";
import type { AiConsentState } from "../hooks/useAiConsent";

/**
 * Explains what an AI feature sends to OpenAI and records the user's choice. Opened either
 * in front of a pending request (the secondary action then still sends it, answered by the
 * built-in templates) or from Settings/the banner with no request waiting.
 */
export function AiConsentDialog({
  feature,
  pendingRequest,
  onAllow,
  onDecline,
  onDismiss,
}: {
  feature: AiFeature | null;
  pendingRequest: boolean;
  onAllow: () => Promise<void>;
  onDecline: () => void;
  onDismiss: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const use = feature ? aiDataUse(feature) : null;

  const allow = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onAllow();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your choice. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Use AI features?" onClose={onDismiss}>
      <div className="-mt-2 space-y-4 text-sm leading-6 text-muted">
        <p>
          To answer questions and generate plans, Circle Health can send the relevant health data to{" "}
          <strong className="text-ink">OpenAI</strong> in the United States.
        </p>
        {use && (
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-[.08em] text-muted">{use.feature} sends</p>
            <p className="mt-1 text-ink">{use.sent}</p>
          </div>
        )}
        <details className="rounded-2xl border border-line px-4 py-3" open={!use}>
          <summary className="cursor-pointer text-xs font-bold text-ink">What each AI feature sends</summary>
          <dl className="mt-3 space-y-3">
            {AI_DATA_USES.map((item) => (
              <div key={item.id}>
                <dt className="text-xs font-semibold text-ink">{item.feature}{item.note ? ` (${item.note.replace(/\.$/, "").toLowerCase()})` : ""}</dt>
                <dd className="text-xs leading-5">{item.sent}</dd>
              </div>
            ))}
          </dl>
        </details>
        <p className="flex gap-2">
          <ShieldCheck size={16} className="mt-1 shrink-0 text-success" />
          <span>
            Your name, email and account ID are never included. Anything you type yourself, such as a question, meal name or
            training preference, is sent as written. OpenAI may keep request data for a limited period under its own policy,
            and deleting it here cannot recall what was already sent.
          </span>
        </p>
        <p>
          {pendingRequest ? "If you continue without AI" : "While AI is off"}, Circle Health uses built-in templates and sends
          nothing to OpenAI. You can change this at any time in Settings.{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2">
            Privacy Policy <ExternalLink size={12} />
          </a>
        </p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-semibold text-coral">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={pendingRequest ? onDecline : onDismiss}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:bg-surface-muted"
        >
          {pendingRequest ? "Continue without AI" : "Not now"}
        </button>
        <PillButton onClick={() => void allow()} disabled={saving} className="bg-ink text-white">
          <Sparkles size={15} />
          {saving ? "Saving…" : "Allow AI features"}
        </PillButton>
      </div>
    </Modal>
  );
}

/** One line under an AI trigger saying what happens with the user's data right now. */
export function AiNotice({ consent, feature, className = "" }: { consent: AiConsentState; feature: AiFeature; className?: string }) {
  if (!consent.known) return null;
  return (
    <p className={`text-[11px] leading-5 text-muted ${className}`}>
      {consent.allowed ? (
        <>Sends {aiDataUse(feature).summary} to OpenAI. Your name and email are never included. </>
      ) : (
        <>AI is off, so this uses Circle Health's built-in templates and sends nothing to OpenAI. </>
      )}
      <Link to="/settings?section=Data" className="font-semibold text-ink underline underline-offset-2">
        {consent.allowed ? "Manage in Settings" : "Turn on AI in Settings"}
      </Link>
    </p>
  );
}

const BANNER_KEY = "circle_ai_off_banner_dismissed";

/** Tells users arriving at Circle AI that AI is off until they allow it, so answers do not look broken. */
export function AiOffBanner({ consent }: { consent: AiConsentState }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(BANNER_KEY) === "true"; } catch { return false; }
  });
  if (!consent.known || consent.allowed || dismissed) return null;
  const dismiss = () => {
    try { localStorage.setItem(BANNER_KEY, "true"); } catch { /* the banner is only a hint */ }
    setDismissed(true);
  };
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet/10 text-violet"><Sparkles size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">AI features are off</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">
          Circle is answering with built-in guidance and templates, and nothing is sent to OpenAI. Allow AI features for
          answers and plans written by OpenAI.
        </p>
        <button type="button" onClick={consent.openSettings} className="mt-2 text-xs font-bold text-violet hover:underline">
          Review and turn on AI
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss AI notice" className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-muted hover:text-ink">
        <X size={15} />
      </button>
    </div>
  );
}
