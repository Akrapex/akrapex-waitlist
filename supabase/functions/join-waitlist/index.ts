import { createClient } from "npm:@supabase/supabase-js@2";

const ROLES = new Set([
  "developer",
  "landlord",
  "manager",
  "agent",
  "renter",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERRAL_CODE_PATTERN = /^AKR-[A-Z0-9]{10}$/;
const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  landlord: "Landlord / Owner",
  manager: "Property Manager",
  agent: "Agent / Broker",
  renter: "Renter / Buyer",
};

type WaitlistRow = {
  id: string;
  waitlist_number: number;
  email: string;
  role: string;
  referral_code: string;
  referral_count: number;
};

type RequestBody = {
  email?: unknown;
  role?: unknown;
  referredByCode?: unknown;
  website?: unknown;
};

function getAllowedOrigins() {
  return (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function getCorsHeaders(request: Request) {
  const origin = (request.headers.get("origin") || "").replace(/\/$/, "");
  const allowedOrigins = getAllowedOrigins();
  const originIsAllowed =
    allowedOrigins.length === 0 ||
    !origin ||
    allowedOrigins.includes(origin);
  const responseOrigin =
    allowedOrigins.length === 0
      ? origin || "*"
      : allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0];

  return {
    originIsAllowed,
    headers: {
      "Access-Control-Allow-Origin": responseOrigin,
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  };
}

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  const cors = getCorsHeaders(request);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors.headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function generateReferralCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let code = "AKR-";

  for (const byte of bytes) {
    code += REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length];
  }

  return code;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReferralLink(referralCode: string) {
  const configuredSiteUrl = Deno.env.get("AKRAPEX_SITE_URL")?.trim();
  if (!configuredSiteUrl) return "";

  try {
    const url = new URL(configuredSiteUrl);
    url.searchParams.set("ref", referralCode);
    return url.toString();
  } catch (_) {
    console.error("AKRAPEX_SITE_URL is not a valid absolute URL.");
    return "";
  }
}

function buildConfirmationEmail(row: WaitlistRow) {
  const roleLabel = ROLE_LABELS[row.role] || row.role;
  const referralLink = buildReferralLink(row.referral_code);
  const safeRole = escapeHtml(roleLabel);
  const safeReferralLink = escapeHtml(referralLink);
  const safeReferralCode = escapeHtml(row.referral_code);

  const referralSection = referralLink
    ? `
      <tr>
        <td style="padding:0 32px 32px;">
          <div style="background:#E7F0E8;border:1px solid #D8E4D9;border-radius:14px;padding:20px;">
            <p style="margin:0 0 8px;color:#5E6E67;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Your personal referral link</p>
            <p style="margin:0 0 16px;color:#22342E;font-size:14px;line-height:1.55;word-break:break-all;">${safeReferralLink}</p>
            <a href="${safeReferralLink}" style="display:inline-block;background:#22342E;color:#F6F4EE;text-decoration:none;border-radius:999px;padding:12px 20px;font-size:14px;font-weight:700;">Share your link</a>
          </div>
        </td>
      </tr>`
    : `
      <tr>
        <td style="padding:0 32px 32px;color:#5E6E67;font-size:14px;line-height:1.6;">
          Your referral code is <strong style="color:#22342E;">${safeReferralCode}</strong>.
        </td>
      </tr>`;

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#EEF2ED;font-family:Arial,Helvetica,sans-serif;color:#22342E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2ED;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#F7F8F4;border:1px solid #DDE6DD;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0F2E29,#1B4C4A);padding:32px;text-align:center;">
                <p style="margin:0 0 10px;color:#FFD753;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">Akrapex early access</p>
                <h1 style="margin:0;color:#FFFFFF;font-size:30px;line-height:1.2;">Your place is secured.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 22px;">
                <p style="margin:0 0 16px;color:#35453E;font-size:16px;line-height:1.65;">Welcome to Akrapex. You have successfully joined the waitlist as a <strong>${safeRole}</strong>.</p>
                <div style="background:#FFF7D8;border:1px solid #F0D477;border-radius:14px;padding:20px;text-align:center;">
                  <p style="margin:0 0 6px;color:#7A681E;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Your waitlist number</p>
                  <p style="margin:0;color:#143A34;font-size:38px;font-weight:700;line-height:1;">#${row.waitlist_number}</p>
                </div>
              </td>
            </tr>
            ${referralSection}
            <tr>
              <td style="background:#E7F0E8;padding:22px 32px;color:#6A7B74;font-size:12px;line-height:1.6;text-align:center;">
                You received this email because this address was used to join the Akrapex waitlist.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendConfirmationEmail(row: WaitlistRow) {
  const apiKey = Deno.env.get("BREVO_API_KEY")?.trim();
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL")?.trim();
  const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() || "Akrapex";

  if (!apiKey || !senderEmail) {
    console.error(
      "Confirmation email skipped: BREVO_API_KEY or BREVO_SENDER_EMAIL is missing.",
    );
    return false;
  }

  try {
    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: row.email }],
        subject: `You're on the Akrapex waitlist — #${row.waitlist_number}`,
        htmlContent: buildConfirmationEmail(row),
        tags: ["akrapex-waitlist"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Brevo email failed (${response.status}):`,
        errorText.slice(0, 1000),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Brevo email request failed:", error);
    return false;
  }
}

function publicWaitlistResult(
  row: WaitlistRow,
  alreadySubscribed: boolean,
  referralApplied: boolean,
) {
  return {
    success: true,
    alreadySubscribed,
    referralApplied,
    waitlistNumber: row.waitlist_number,
    referralCode: row.referral_code,
    referralCount: row.referral_count,
  };
}

Deno.serve(async (request) => {
  const cors = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors.headers });
  }

  if (!cors.originIsAllowed) {
    return jsonResponse(request, { error: "Origin not allowed." }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return jsonResponse(request, { error: "Request is too large." }, 413);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (_) {
    return jsonResponse(request, { error: "Invalid JSON request." }, 400);
  }

  // Hidden honeypot: real users never populate this field.
  if (typeof body.website === "string" && body.website.trim()) {
    return jsonResponse(request, { error: "Unable to process this request." }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim().toLowerCase();
  const referredByCode = String(body.referredByCode || "")
    .trim()
    .toUpperCase();

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return jsonResponse(request, { error: "Enter a valid email address." }, 400);
  }

  if (!ROLES.has(role)) {
    return jsonResponse(request, { error: "Select a valid Akrapex role." }, 400);
  }

  if (referredByCode && !REFERRAL_CODE_PATTERN.test(referredByCode)) {
    return jsonResponse(request, { error: "The referral code is invalid." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase function environment variables.");
    return jsonResponse(request, { error: "Waitlist service is not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const selectFields =
    "id, waitlist_number, email, role, referral_code, referral_count";

  const { data: existing, error: existingError } = await supabase
    .from("waitlist")
    .select(selectFields)
    .eq("email", email)
    .maybeSingle<WaitlistRow>();

  if (existingError) {
    console.error("Waitlist lookup failed:", existingError);
    return jsonResponse(request, { error: "Unable to check the waitlist." }, 500);
  }

  if (existing) {
    return jsonResponse(request, publicWaitlistResult(existing, true, false));
  }

  let referrerId: string | null = null;
  if (referredByCode) {
    const { data: referrer, error: referrerError } = await supabase
      .from("waitlist")
      .select("id")
      .eq("referral_code", referredByCode)
      .maybeSingle<{ id: string }>();

    if (referrerError) {
      console.error("Referral lookup failed:", referrerError);
      return jsonResponse(request, { error: "Unable to validate the referral." }, 500);
    }

    referrerId = referrer?.id || null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const { data: created, error: insertError } = await supabase
      .from("waitlist")
      .insert({
        email,
        role,
        referral_code: referralCode,
        referred_by: referrerId,
      })
      .select(selectFields)
      .single<WaitlistRow>();

    if (!insertError && created) {
      const emailSent = await sendConfirmationEmail(created);

      return jsonResponse(
        request,
        {
          ...publicWaitlistResult(created, false, Boolean(referrerId)),
          emailSent,
        },
        201,
      );
    }

    if (insertError?.code === "23505") {
      // A simultaneous request may have inserted the email first. Return that
      // existing subscriber; otherwise retry because the code itself collided.
      const { data: racedExisting } = await supabase
        .from("waitlist")
        .select(selectFields)
        .eq("email", email)
        .maybeSingle<WaitlistRow>();

      if (racedExisting) {
        return jsonResponse(
          request,
          publicWaitlistResult(racedExisting, true, false),
        );
      }

      continue;
    }

    console.error("Waitlist insert failed:", insertError);
    return jsonResponse(request, { error: "Unable to join the waitlist." }, 500);
  }

  return jsonResponse(
    request,
    { error: "Unable to generate a unique referral code. Please try again." },
    503,
  );
});
