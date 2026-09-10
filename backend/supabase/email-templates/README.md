# Knowbase Auth email templates

Supabase sends Auth mail from its dashboard templates (not from this repo at runtime).  
Paste these HTML files into **Supabase → Authentication → Email Templates**.

| File | Dashboard template | Suggested subject |
|------|--------------------|-------------------|
| `confirm-signup.html` | Confirm signup | `Confirm your Knowbase email` |
| `reset-password.html` | Reset password | `Reset your Knowbase password` |
| `magic-link.html` | Magic link | `Your Knowbase sign-in link` |
| `change-email.html` | Change email address | `Confirm your new Knowbase email` |

Keep `{{ .ConfirmationURL }}` exactly as-is — Supabase replaces it.

Also set under **Authentication → URL Configuration**:

- **Site URL:** `https://knowbase.sudohomelab.dpdns.org` (not `http://localhost:5173`)
- **Redirect URLs** (allow list):
  - `https://knowbase.sudohomelab.dpdns.org/**`
  - `http://localhost:5173/**` (local Vite)
  - `http://localhost:8080/**` (local Docker web)

If Site URL stays on localhost, confirmation links open `localhost:5173` even from production.

Optional: custom SMTP (Resend / Postmark) under **Project Settings → Authentication → SMTP** so the From address isn’t `noreply@mail.app.supabase.io`.
