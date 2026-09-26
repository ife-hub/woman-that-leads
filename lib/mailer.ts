import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendInviteEmail(opts: {
  to: string;
  aka: string;
  qrBuffer: Buffer;
}) {
  const transport = getTransport();

  // The address itself is fixed to whatever GMAIL_USER is authenticated as
  // (or a verified "Send mail as" alias on that account) — Gmail's SMTP
  // rejects/rewrites anything else. The display name isn't sensitive, so
  // it's hardcoded here rather than stored as an env var (a non-secret
  // value in an env var still trips build-time secret scanners like
  // Netlify's whenever it appears in plain text elsewhere in the code).
  const fromAddress = process.env.GMAIL_USER;
  const fromName = "Woman That Leads";

  const logoPath = path.join(process.cwd(), "public", "logo-mark.png");
  const hasLogo = fs.existsSync(logoPath);

  const html = `
  <div style="background:#FAF6EE;padding:48px 24px;font-family:Helvetica,Arial,sans-serif;color:#2A2018;">
    <div style="max-width:480px;margin:0 auto;text-align:center;background:#FFFEFA;border:1px solid #E6DCC8;">

      <div style="background:#3C1220;padding:32px 24px;">
        ${
          hasLogo
            ? `<img src="cid:logo" width="140" alt="Woman That Leads" style="display:block;margin:0 auto;" />`
            : `<p style="color:#E9D6A8;letter-spacing:3px;font-size:13px;margin:0;">WOMAN THAT LEADS</p>`
        }
      </div>

      <div style="padding:36px 28px;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;margin:0 0 4px;color:#2A2018;">
          You&rsquo;re <em style="color:#3C1220;">registered</em>
        </h1>
        <p style="font-size:15px;line-height:1.6;color:#6c6152;margin:16px 0 28px;">
          ${escapeHtml(opts.aka)}, thank you for registering for Woman That Leads. Show the
          code below at the door on the day.
        </p>

        ${
          hasLogo
            ? `<img src="cid:checkinqr" width="200" height="200" alt="Your check-in QR code" style="display:block;margin:0 auto 12px;border:1px solid #E6DCC8;padding:12px;background:#ffffff;" />`
            : `<img src="cid:checkinqr" width="200" height="200" alt="Your check-in QR code" style="display:block;margin:0 auto 12px;border:1px solid #E6DCC8;padding:12px;background:#ffffff;" />`
        }
        <p style="font-size:11px;letter-spacing:2px;color:#a68a56;text-transform:uppercase;margin:0;">
          Check-in Pass
        </p>
      </div>

      <div style="background:#FAF6EE;border-top:1px solid #E6DCC8;padding:18px 24px;">
        <p style="font-size:11px;letter-spacing:2px;color:#a68a56;text-transform:uppercase;margin:0;">
          Woman That Leads
        </p>
      </div>

    </div>
  </div>`;

  await transport.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: opts.to,
    subject: "You're registered — Woman That Leads",
    html,
    attachments: [
      {
        filename: "checkin-qr.png",
        content: opts.qrBuffer,
        cid: "checkinqr",
      },
      ...(hasLogo
        ? [
            {
              filename: "logo.png",
              path: logoPath,
              cid: "logo",
            },
          ]
        : []),
    ],
  });
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}