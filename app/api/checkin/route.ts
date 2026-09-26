import { NextRequest, NextResponse } from "next/server";
import { checkInByToken } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  let body: { token?: string; passcode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid request." }, { status: 400 });
  }

  const expectedPasscode = process.env.CHECKIN_PASSCODE;
  if (!expectedPasscode) {
    return NextResponse.json(
      { status: "error", message: "Check-in isn't configured (missing CHECKIN_PASSCODE)." },
      { status: 500 }
    );
  }
  if (body.passcode !== expectedPasscode) {
    return NextResponse.json({ status: "error", message: "Incorrect passcode." }, { status: 401 });
  }

  if (!body.token) {
    return NextResponse.json({ status: "error", message: "Missing token." }, { status: 400 });
  }

  // The QR encodes {"t": "<token>"}; accept that shape or a raw token string.
  let token = body.token;
  try {
    const parsed = JSON.parse(body.token);
    if (parsed && typeof parsed.t === "string") {
      token = parsed.t;
    }
  } catch {
    // not JSON — treat body.token as the raw token
  }

  if (token === "__passcode_check__") {
    // Used by the scanner's unlock screen to verify the passcode without a real scan.
    return NextResponse.json({ status: "not_found" });
  }

  try {
    const result = await checkInByToken(token);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Check-in failed:", err);
    return NextResponse.json(
      { status: "error", message: "Could not verify right now." },
      { status: 502 }
    );
  }
}