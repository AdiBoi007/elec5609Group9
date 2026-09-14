import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AiConsentDialog } from "../components/AiConsent";
import { AI_NOTICE_VERSION, type AiFeature } from "../content/privacy";
import { api } from "../services/api";
import type { ConsentStatus } from "../types";

const DECLINED_KEY = "circle_ai_declined";

export const isAiAllowed = (status: ConsentStatus | null) =>
  !!status && !!status.aiConsentAt && status.aiConsentVersion === status.currentAiVersion;

export type AiConsentState = {
  /** False until the consent status has loaded, or when the server does not report one. */
  known: boolean;
  allowed: boolean;
  status: ConsentStatus | null;
  /**
   * Call before sending an AI request. Resolves true when the request should go ahead: AI is
   * allowed, the user chose to continue without AI (the server then uses templates), or the
   * server predates consent. Resolves false when the dialog was dismissed.
   */
  confirm: (feature: AiFeature) => Promise<boolean>;
  /** Opens the explanation with no request waiting, e.g. from Settings or the banner. */
  openSettings: () => void;
  revoke: () => Promise<void>;
  dialog: ReactNode;
};

type Prompt = { feature: AiFeature | null; resolve?: (proceed: boolean) => void };

const declinedThisSession = () => {
  try { return sessionStorage.getItem(DECLINED_KEY) === "true"; } catch { return false; }
};

export function useAiConsent(): AiConsentState {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const loading = useRef<Promise<ConsentStatus | null> | null>(null);

  // A request can be triggered before the status arrives (e.g. /ai?q=...), so confirm()
  // waits on the same load instead of guessing.
  const load = useCallback(() => {
    loading.current ??= api.getProfile()
      .then((profile) => { const next = profile.privacy ?? null; setStatus(next); return next; })
      .catch(() => null);
    return loading.current;
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remember = (next: ConsentStatus) => {
    setStatus(next);
    loading.current = Promise.resolve(next);
  };

  const confirm = useCallback(async (feature: AiFeature) => {
    const current = await load();
    if (!current || isAiAllowed(current) || declinedThisSession()) return true;
    return new Promise<boolean>((resolve) => setPrompt({ feature, resolve }));
  }, [load]);

  const openSettings = useCallback(() => setPrompt({ feature: null }), []);

  const revoke = useCallback(async () => {
    await api.revokeAiConsent();
    const current = await load();
    if (current) remember({ ...current, aiConsentVersion: null, aiConsentAt: null });
  }, [load]);

  const close = (proceed: boolean) => {
    prompt?.resolve?.(proceed);
    setPrompt(null);
  };

  const dialog = prompt ? (
    <AiConsentDialog
      feature={prompt.feature}
      pendingRequest={!!prompt.resolve}
      onAllow={async () => { remember(await api.grantAiConsent(AI_NOTICE_VERSION)); close(true); }}
      onDecline={() => {
        try { sessionStorage.setItem(DECLINED_KEY, "true"); } catch { /* ask again next time */ }
        close(true);
      }}
      onDismiss={() => close(false)}
    />
  ) : null;

  return { known: status !== null, allowed: isAiAllowed(status), status, confirm, openSettings, revoke, dialog };
}
