import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { appendRsvpRow } from "@/lib/sheets";
import { generateCheckInQr } from "@/lib/qr";
import { sendInviteEmail } from "@/lib/mailer";
import { isValidEmailFormat, validatePhoneNumber } from "@/lib/validation";
import type { RsvpPayload, RsvpResponse } from "@/lib/types";

const REQUIRED_FIELDS: (keyof RsvpPayload)[] = [
  "title",
  "fullName",
  "email",
  "phone",
  "phoneIsWhatsapp",
  "age",
  "isStudent",
  "courseOfStudy",
  "institution",
  "comingWithSomeone",
  "howHeard",
  "wantsUpdates",
];

export async function POST(req: NextRequest) {
  let body: Partial<RsvpPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) {
      return NextResponse.json<RsvpResponse>(
        { ok: false, error: `Missing field: ${field}` },
        { status: 400 }
      );
    }
  }

  if (!isValidEmailFormat(body.email ?? "")) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "That email doesn't look right." },
      { status: 400 }
    );
  }

  const phoneCheck = validatePhoneNumber(body.phone ?? "");
  if (!phoneCheck.valid) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "That phone number doesn't look valid." },
      { status: 400 }
    );
  }

  // Conditional fields: only required when their trigger question calls for them.
  let whatsappCheck: { valid: boolean; e164?: string } = { valid: true, e164: undefined };
  if (body.phoneIsWhatsapp === "No") {
    if (!body.whatsapp) {
      return NextResponse.json<RsvpResponse>(
        { ok: false, error: "Missing field: whatsapp" },
        { status: 400 }
      );
    }
    whatsappCheck = validatePhoneNumber(body.whatsapp);
    if (!whatsappCheck.valid) {
      return NextResponse.json<RsvpResponse>(
        { ok: false, error: "That WhatsApp number doesn't look valid." },
        { status: 400 }
      );
    }
  }
  if (body.isStudent === "Yes" && !body.level) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Missing field: level" },
      { status: 400 }
    );
  }
  if (body.level === "Other" && !body.levelOther) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Missing field: levelOther" },
      { status: 400 }
    );
  }
  if (body.comingWithSomeone === "Yes" && !body.companionCount) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Missing field: companionCount" },
      { status: 400 }
    );
  }
  if (body.howHeard === "Other" && !body.howHeardOther) {
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Missing field: howHeardOther" },
      { status: 400 }
    );
  }

  const payload = body as RsvpPayload;
  const checkInToken = uuidv4();

  // Store normalized E.164 numbers (e.g. +2348012345678) so the sheet stays
  // consistent regardless of how each number was typed. When the phone
  // number is also the WhatsApp number, mirror it server-side rather than
  // trusting the client to have done so.
  const normalizedPhone = phoneCheck.e164 ?? payload.phone;
  const normalizedWhatsapp =
    payload.phoneIsWhatsapp === "Yes" ? normalizedPhone : whatsappCheck.e164 ?? payload.whatsapp;

  // 1. Log to Google Sheets.
  try {
    await appendRsvpRow({
      ...payload,
      phone: normalizedPhone,
      whatsapp: normalizedWhatsapp,
      submittedAt: new Date().toISOString(),
      checkInToken,
      checkedIn: false,
    });
  } catch (err) {
    console.error("Google Sheets append failed:", err);
    return NextResponse.json<RsvpResponse>(
      { ok: false, error: "Could not save your response right now. Please try again shortly." },
      { status: 502 }
    );
  }

  // 2. Generate the check-in QR and email it to the registrant.
  try {
    const { dataUrl, buffer } = await generateCheckInQr(checkInToken);
    await sendInviteEmail({ to: payload.email, aka: payload.fullName, qrBuffer: buffer });
    return NextResponse.json<RsvpResponse>({ ok: true, qrDataUrl: dataUrl });
  } catch (err) {
    console.error("QR/email step failed:", err);
    // Row is already saved — surface a partial success so the UI can say so.
    return NextResponse.json<RsvpResponse>({
      ok: true,
      error: "You're registered, but the invite email couldn't be sent — we'll follow up.",
    });
  }
}