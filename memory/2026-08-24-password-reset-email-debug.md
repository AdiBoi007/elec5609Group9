# Password reset email debug report

- Symptom: Clicking "Forgot password?" showed a success message, but no email arrived.
- Root cause: The button only called `setError(...)`; it never called Supabase. The `/reset-password` route and password update form were also missing.
- Fix: `AuthPages.tsx` now calls `supabase.auth.resetPasswordForEmail` with a `/reset-password` redirect and exposes Supabase errors. It also provides a recovery-session password form that calls `supabase.auth.updateUser`. `App.tsx` registers the new public route.
- Evidence: `npm run build` and `npm run lint` both pass. Source inspection confirms the request, redirect, route, and update call are present.
- Regression verification: Browser verification was attempted, but the local gstack browser daemon timed out behind a stale startup lock. No real email request was made because that would require the user's address and consume the project's email quota.
- Related: Supabase's built-in mailer is limited to two auth emails per project per hour and may only deliver to organization-authorized addresses. `http://localhost:5173/reset-password` must be present in the Supabase redirect allow list.
- Status: DONE_WITH_CONCERNS
