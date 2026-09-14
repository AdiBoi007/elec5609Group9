import { useState } from "react";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { PillButton } from "./ui";
import { api } from "../services/api";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from "../content/privacy";

/**
 * Blocking prompt for accounts that have not agreed to the current Privacy Policy:
 * accounts created before it existed, and everyone after the policy version changes.
 * It deliberately has no close button and ignores Escape and backdrop clicks; the only
 * ways out are agreeing or signing out.
 */
export function PrivacyNoticeModal({
  onAccepted,
  onSignOut,
}: {
  onAccepted: () => void;
  onSignOut: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const agree = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await api.acceptPrivacy(PRIVACY_NOTICE_VERSION);
      onAccepted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your choice. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-notice-title"
        aria-describedby="privacy-notice-body"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-surface p-7 text-ink shadow-2xl"
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted">
          <ShieldCheck size={20} />
        </span>
        <h2 id="privacy-notice-title" className="mt-5 text-2xl font-bold tracking-[-0.03em]">
          How Circle Health handles your data
        </h2>
        <div id="privacy-notice-body" className="mt-3 space-y-3 text-sm leading-6 text-muted">
          <p>
            Please review what Circle Health collects, where it is stored, and how AI features use it. You need to agree
            before continuing.
          </p>
          <p>
            Your records, including health information and dietary or cultural preferences, are stored in Singapore.
            Nothing is sent to OpenAI unless you choose to allow AI features.
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-coral/10 p-3 text-sm font-semibold text-coral">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:bg-surface-muted"
          >
            Review Privacy Policy
            <ExternalLink size={14} />
          </a>
          <PillButton autoFocus onClick={() => void agree()} disabled={saving} className="bg-ink text-white">
            {saving ? "Saving…" : "I agree"}
          </PillButton>
        </div>
        <div className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
          Don't agree?{" "}
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
            <LogOut size={12} />
            Sign out
          </button>
          , or email{" "}
          <a className="font-semibold text-ink underline underline-offset-2" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
            {PRIVACY_CONTACT_EMAIL}
          </a>{" "}
          to have your data deleted.
        </div>
      </div>
    </div>
  );
}
