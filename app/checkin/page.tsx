"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { Fraunces, Inter } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const fontVars = `${fraunces.variable} ${inter.variable}`;
const displayFont = "font-[family-name:var(--font-display)]";
const bodyFont = "font-[family-name:var(--font-body)]";

type ScanResult =
  | { status: "success"; fullName: string; title: string }
  | { status: "already"; fullName: string; title: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

const STORAGE_KEY = "checkin-passcode";

export default function CheckInPage() {
  const [passcode, setPasscode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockRef = useRef(false);

  // Auto-unlock if the passcode was already entered this session.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      setPasscode(stored);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked || !cameraActive) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 260 },
          (decodedText) => handleScan(decodedText),
          () => {
            /* ignore per-frame "no code found" noise */
          }
        )
        .catch((err) => {
          console.error("Camera start failed:", err);
          setResult({ status: "error", message: "Couldn't access the camera." });
        });
    });

    return () => {
      cancelled = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, cameraActive]);

  const handleScan = async (decodedText: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setChecking(true);
    setCameraActive(false); // triggers the effect's cleanup, which stops the camera

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: decodedText, passcode }),
      });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ status: "error", message: "Couldn't reach the server." });
    } finally {
      setChecking(false);
    }
  };

  const scanAnother = () => {
    setResult(null);
    lockRef.current = false;
    setCameraActive(true);
  };

  const submitPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "__passcode_check__", passcode }),
    });

    if (res.status === 401) {
      setAuthError("Incorrect passcode.");
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, passcode);
    setUnlocked(true);
  };

  if (!unlocked) {
    return (
      <main
        className={`${fontVars} ${bodyFont} flex min-h-screen items-center justify-center bg-[#FAF6EE] px-6`}
      >
        <form onSubmit={submitPasscode} className="flex w-full max-w-xs flex-col gap-5 text-center">
          <h1 className={`${displayFont} text-2xl font-medium text-[#2A2018]`}>Door check-in</h1>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            className="border-0 border-b-[1.5px] border-[#E6DCC8] bg-transparent px-0.5 py-2 text-center text-[17px] text-[#2A2018] outline-none transition-colors placeholder:text-[#b8ab97] focus:border-[#C79A4B]"
          />
          {authError && <p className="text-sm text-[#93372F]">{authError}</p>}
          <button
            type="submit"
            className="rounded-full border border-[#3C1220] bg-[#3C1220] px-8 py-3 text-sm text-[#E9D6A8] transition-colors hover:bg-[#4E1A2B]"
          >
            Unlock scanner
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={`${fontVars} ${bodyFont} flex min-h-screen flex-col items-center bg-[#FAF6EE] px-6 py-10`}>
      <h1 className={`${displayFont} mb-6 text-2xl font-medium text-[#2A2018]`}>Scan a ticket</h1>

      {cameraActive ? (
        <div
          id="qr-reader"
          className="w-full max-w-sm overflow-hidden rounded-lg border border-[#E6DCC8] bg-black"
        />
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="w-full min-h-[92px]">
            {checking && !result && (
              <p className="text-center text-sm text-[#8a7d6c]">Checking…</p>
            )}
            {result?.status === "success" && (
              <ResultBanner
                tone="success"
                title={[result.title, result.fullName].filter(Boolean).join(" ")}
                subtitle="Checked in"
              />
            )}
            {result?.status === "already" && (
              <ResultBanner
                tone="warning"
                title={[result.title, result.fullName].filter(Boolean).join(" ")}
                subtitle="Already checked in"
              />
            )}
            {result?.status === "not_found" && (
              <ResultBanner tone="error" title="Not found" subtitle="This code doesn't match a registration" />
            )}
            {result?.status === "error" && (
              <ResultBanner tone="error" title="Error" subtitle={result.message} />
            )}
          </div>

          {!checking && (
            <button
              type="button"
              onClick={scanAnother}
              className="rounded-full border border-[#3C1220] bg-[#3C1220] px-8 py-3 text-sm text-[#E9D6A8] transition-colors hover:bg-[#4E1A2B]"
            >
              Scan another
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function ResultBanner({
  tone,
  title,
  subtitle,
}: {
  tone: "success" | "warning" | "error";
  title: string;
  subtitle: string;
}) {
  const styles = {
    success: "border-[#4C7A4C] bg-[#EEF5EE] text-[#2E4A2E]",
    warning: "border-[#C79A4B] bg-[#FBF3E2] text-[#7A5A1E]",
    error: "border-[#93372F] bg-[#FBEAE8] text-[#93372F]",
  }[tone];

  return (
    <div className={`border px-5 py-4 text-center ${styles}`}>
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-1 text-sm">{subtitle}</p>
    </div>
  );
}