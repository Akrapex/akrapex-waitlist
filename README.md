# Akrapex Supabase Waitlist

This package contains the existing Akrapex landing-page UI plus a Supabase-backed
waitlist, referral system, and automatic Brevo confirmation email.

## Project structure

```text
akrapex-tailwind/
├── index.html
├── styles.css
├── config.js
├── app.js
├── assets/                         # Keep the existing Akrapex images here
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 202608260001_create_waitlist.sql
    ├── functions/
    │   └── join-waitlist/
    │       └── index.ts
    └── tests/
        └── waitlist_test.sql
```

## What the implementation does

- Stores one row per unique, normalized email address.
- Keeps the selected Akrapex role for all five doors.
- Generates the waitlist number in PostgreSQL rather than in the browser.
- Generates referral codes securely inside the Edge Function.
- Records the referring subscriber with a self-referencing foreign key.
- Increments referral counts only after a genuinely new subscriber is inserted.
- Provides a management view named `waitlist_priority` where successful
  referrals improve the subscriber's launch priority.
- Prevents browser clients from reading or writing the table directly.
- Returns an existing subscriber's original number and link on duplicate signup.
- Sends a branded confirmation email through Brevo after a new subscriber is
  saved successfully.

## 1. Configure the frontend

Open `config.js` and replace:

```js
supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co"
```

with the Project URL shown in Supabase under **Project Settings → API**.

Set `siteUrl` to the final public landing-page URL. Example:

```js
siteUrl: "https://akrapex.com/"
```

No Supabase service-role key or secret belongs in `config.js`.

## 2. Link the local Supabase folder

From this project directory:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 3. Create the database objects

```bash
supabase db push
```

This creates:

- `public.waitlist`
- the referral-count trigger
- `public.waitlist_priority`
- indexes, validation constraints, and RLS protection

## 4. Configure Brevo

In Brevo, verify the sender email or authenticate the sender domain. Then create
an API key under **Settings → SMTP & API → API Keys & MCP**. Create a regular API
key; do not enable the MCP-key option.

Add the following secrets from the Supabase **Edge Function Secrets Management**
page. Replace the example values with your real settings:

```text
BREVO_API_KEY=xkeysib-your-private-brevo-api-key
BREVO_SENDER_EMAIL=hello@akrapex.com
BREVO_SENDER_NAME=Akrapex
AKRAPEX_SITE_URL=https://akrapex.com/
```

The sender email must be verified in Brevo. `AKRAPEX_SITE_URL` is used to put
the subscriber's personal referral link inside the email. These values are
server-side secrets; never put them in `config.js`, `app.js`, or GitHub.

## 5. Restrict the Edge Function to your websites

Use a comma-separated list. Include every production and local-development
origin that should be allowed:

```bash
supabase secrets set ALLOWED_ORIGINS="https://akrapex.com,http://localhost:5500,http://127.0.0.1:5500"
```

The hosted Edge Function already receives `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from Supabase. Never put the service-role key in the
browser files.

## 6. Deploy the function

```bash
supabase functions deploy join-waitlist --no-verify-jwt
```

The function is deliberately public because waitlist visitors are not signed-in
users. Database access remains server-side and the table itself has no anonymous
client privileges.

## Optional database test

With the Supabase local stack running, execute:

```bash
supabase test db
```

The included pgTAP test verifies the table and priority view, referral counting,
referrer relationships, priority movement, and duplicate-email protection.

## 7. Run the static page locally

Do not open `index.html` with a `file://` URL. Serve the directory over HTTP:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Referral behaviour

A generated link looks like:

```text
https://akrapex.com/?ref=AKR-4M7Q9X2K8P
```

The frontend validates and remembers the code. On signup, the Edge Function
looks up the referrer and stores the relationship. PostgreSQL then increments
the referrer's `referral_count`. Invalid or missing codes do not prevent a valid
person from joining, while malformed referral values are rejected.

## Management queries

Run these from the Supabase SQL Editor or a secured management backend:

```sql
-- Latest signups
select *
from public.waitlist
order by created_at desc;

-- Referral-adjusted launch priority
select *
from public.waitlist_priority
order by priority_rank, created_at;

-- Signups per role
select role, count(*) as subscribers
from public.waitlist
group by role
order by subscribers desc;
```

## Confirmation email behaviour

- A confirmation email is sent only after a genuinely new row is created.
- Re-entering an email already on the waitlist does not send another message,
  which prevents the public form from being used to repeatedly email someone.
- The email contains the subscriber's role, real waitlist number, and personal
  referral link.
- A temporary Brevo delivery failure does not remove a valid waitlist signup.
  The failure is recorded in the Edge Function logs for troubleshooting.
