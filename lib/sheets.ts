import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { RsvpPayload } from "./types";

function resolvePrivateKey(): string {
  // Preferred: GOOGLE_PRIVATE_KEY_B64, the whole PEM key base64-encoded.
  // No newlines or quotes to mangle in .env, so this is the most reliable option.
  const b64 = process.env.GOOGLE_PRIVATE_KEY_B64;
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf-8");
  }

  // Fallback: raw GOOGLE_PRIVATE_KEY with literal \n sequences.
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  if (raw) {
    return raw.replace(/\\n/g, "\n");
  }

  throw new Error(
    "Missing private key. Set either GOOGLE_PRIVATE_KEY_B64 (recommended) or GOOGLE_PRIVATE_KEY."
  );
}

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !sheetId) {
    throw new Error(
      "Missing Google Sheets env vars. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SHEET_ID."
    );
  }

  const key = resolvePrivateKey();

  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY(_B64) doesn't look like a valid PEM key — check it wasn't truncated or double-escaped."
    );
  }

  const jwt = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return new GoogleSpreadsheet(sheetId, jwt);
}

/**
 * Appends one RSVP as a new row on the first tab of the sheet.
 * The header row (see README) must already exist and match these keys.
 */
export async function appendRsvpRow(
  payload: RsvpPayload & { submittedAt: string; checkInToken: string; checkedIn: boolean }
) {
  const doc = getClient();
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  await sheet.addRow(
    {
      "Submitted At": payload.submittedAt,
      Title: payload.title,
      "Full Name": payload.fullName,
      Email: payload.email,
      Phone: payload.phone,
      "Is Phone WhatsApp": payload.phoneIsWhatsapp,
      WhatsApp: payload.whatsapp ?? "",
      Age: payload.age,
      "Is Student": payload.isStudent,
      Level: payload.level ?? "",
      "Level Other": payload.levelOther ?? "",
      "Course Of Study": payload.courseOfStudy,
      Institution: payload.institution,
      "Coming With Someone": payload.comingWithSomeone,
      "Companion Count": payload.companionCount ?? "",
      "How Heard": payload.howHeard,
      "How Heard Other": payload.howHeardOther ?? "",
      "Wants Updates": payload.wantsUpdates,
      "Check-in Token": payload.checkInToken,
      "Checked In": payload.checkedIn ? "TRUE" : "FALSE",
    },
    // raw: true stores values literally instead of parsing them the way
    // Sheets parses manual keyboard entry — without this, phone numbers
    // starting with "+" get misread as the start of a formula (#ERROR!).
    { raw: true }
  );
}

export type CheckInResult =
  | { status: "success"; fullName: string; title: string }
  | { status: "already"; fullName: string; title: string }
  | { status: "not_found" };

/**
 * Looks up a row by its Check-in Token. If found and not yet checked in,
 * marks it Checked In = TRUE and returns the attendee's name so the host
 * can visually confirm identity at the door.
 */
export async function checkInByToken(token: string): Promise<CheckInResult> {
  const doc = getClient();
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  const row = rows.find((r) => r.get("Check-in Token") === token);
  if (!row) {
    return { status: "not_found" };
  }

  const fullName = row.get("Full Name") || "";
  const title = row.get("Title") || "";

  if (row.get("Checked In") === "TRUE") {
    return { status: "already", fullName, title };
  }

  row.set("Checked In", "TRUE");
  await row.save();

  return { status: "success", fullName, title };
}