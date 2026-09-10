# Knowbase Auth email templates

Supabase Auth emails are configured in the dashboard (not loaded from this repo at runtime).

## Important (new Supabase UI)

Custom subject/body are **locked until custom SMTP is enabled**.

You will see: *“Set up custom SMTP to edit templates.”*

1. Open **Authentication → Notifications → Emails → SMTP Settings** (or the **Set up SMTP** button).
2. Enable custom SMTP (Resend / Postmark / etc.).
3. Then open **Templates** → click a row (e.g. **Confirm sign up**) and paste HTML from this folder.

| File | Dashboard template | Suggested subject |
|------|--------------------|-------------------|
| `confirm-signup.html` | Confirm sign up | `Confirm your Knowbase email` |
| `reset-password.html` | Reset password | `Reset your Knowbase password` |
| `magic-link.html` | Magic link or OTP | `Your Knowbase sign-in link` |
| `change-email.html` | Change email address | `Confirm your new Knowbase email` |

Keep `{{ .ConfirmationURL }}` exactly as-is — Supabase replaces it.

Without SMTP you still get the **default** (plain) Supabase emails.

## Fix localhost redirects (works without SMTP)

**Authentication → Configuration → URL Configuration:**

- **Site URL:** `https://knowbase.sudohomelab.dpdns.org` (not `http://localhost:5173`)
- **Redirect URLs:**
  - `https://knowbase.sudohomelab.dpdns.org/**`
  - `http://localhost:5173/**` (local Vite)
  - `http://localhost:8080/**` (local Docker web)

Request a **new** confirmation email after changing Site URL.
