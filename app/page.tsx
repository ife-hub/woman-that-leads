"use client";

import { useState } from "react";
import { Fraunces, Inter } from "next/font/google";
import type { RsvpPayload, RsvpResponse } from "@/lib/types";
import { isValidEmailFormat, suggestEmailCorrection, validatePhoneNumber } from "@/lib/validation";

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

type FormState = Partial<RsvpPayload>;

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  "Let's start with you",
  "How do we reach you",
  "A little more about you",
  "Studies",
  "Who's coming through",
  "Last thing",
  "Check it over",
];

const TITLE_OPTIONS: RsvpPayload["title"][] = ["Mr.", "Miss", "Mrs."];
const AGE_OPTIONS: string[] = [
  "Below 16",
  "16-20",
  "21-25",
  "26-30",
  "31-35",
  "36-40",
  "Above 40",
];
const YES_NO: ("Yes" | "No")[] = ["Yes", "No"];
const LEVEL_OPTIONS: NonNullable<RsvpPayload["level"]>[] = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "Postgraduate",
  "Other",
];
const HOW_HEARD_OPTIONS: RsvpPayload["howHeard"][] = [
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Friend/Family",
  "Church",
  "Campus fellowship",
  "Other",
];

export default function Page() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RsvpResponse | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const update = (patch: FormState) => setForm((f) => ({ ...f, ...patch }));

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return !!form.title && !!form.fullName;
      case 2:
        return (
          !!form.email &&
          isValidEmailFormat(form.email) &&
          !!form.phone &&
          validatePhoneNumber(form.phone).valid &&
          !!form.phoneIsWhatsapp &&
          (form.phoneIsWhatsapp === "Yes" ||
            (!!form.whatsapp && validatePhoneNumber(form.whatsapp).valid))
        );
      case 3:
        return (
          !!form.age &&
          !!form.isStudent &&
          (form.isStudent === "No" || !!form.level) &&
          (form.level !== "Other" || !!form.levelOther)
        );
      case 4:
        return !!form.courseOfStudy && !!form.institution;
      case 5:
        return (
          !!form.comingWithSomeone &&
          (form.comingWithSomeone === "No" || !!form.companionCount)
        );
      case 6:
        return (
          !!form.howHeard &&
          !!form.wantsUpdates &&
          (form.howHeard !== "Other" || !!form.howHeardOther)
        );
      default:
        return true;
    }
  };

  const next = () => {
    setError(null);
    if (!canAdvance()) {
      setError("Fill in everything on this one before you move on.");
      return;
    }
    setStep((s) => {
      let ns = s + 1;
      if (ns === 4 && form.isStudent === "No") ns = 5; // Studies step doesn't apply
      return Math.min(ns, TOTAL_STEPS);
    });
  };

  const back = () => {
    setStep((s) => {
      let ps = s - 1;
      if (ps === 4 && form.isStudent === "No") ps = 3; // Studies step doesn't apply
      return Math.max(ps, 1);
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: RsvpResponse = await res.json();
      if (!res.ok && !data.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      setResult(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return <Confirmation result={result} fullName={form.fullName ?? ""} />;

  if (!started) return <Hero onStart={() => setStarted(true)} />;

  return (
    <main className={`${fontVars} ${bodyFont} min-h-screen bg-[#FAF6EE] md:grid md:grid-cols-[38%_1fr]`}>
      <BrandPanel step={step} />

      <div className="flex items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="whitespace-nowrap text-xs text-[#8a7d6c]">
              {step} / {TOTAL_STEPS}
            </span>
            <div className="relative h-[2px] flex-1 bg-[#E6DCC8]">
              <div
                className="absolute inset-y-0 left-0 bg-[#C79A4B] transition-all duration-500 ease-out"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          <p className="mb-2 text-sm text-[#a68a56]">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h2 className={`${displayFont} mb-8 text-3xl font-medium leading-[1.15] text-[#2A2018] sm:text-4xl`}>
            {STEP_TITLES[step - 1]}
          </h2>

          <div className="min-h-[220px]">
            {step === 1 && (
              <>
                <ChoiceField
                  label="Title"
                  options={TITLE_OPTIONS as string[]}
                  value={form.title}
                  onChange={(v) => update({ title: v as RsvpPayload["title"] })}
                />
                <TextField
                  label="Full name"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={(v) => update({ fullName: v })}
                />
              </>
            )}

            {step === 2 && (
              <>
                <TextField
                  label="Email"
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(v) => update({ email: v })}
                  onBlur={() => touch("email")}
                  error={
                    touched.email && form.email && !isValidEmailFormat(form.email)
                      ? "That email doesn't look right."
                      : undefined
                  }
                  hint={
                    form.email && isValidEmailFormat(form.email)
                      ? (() => {
                          const suggestion = suggestEmailCorrection(form.email!);
                          return suggestion ? (
                            <>
                              Did you mean{" "}
                              <button
                                type="button"
                                onClick={() => update({ email: suggestion })}
                                className="underline decoration-[#C79A4B] underline-offset-2"
                              >
                                {suggestion}
                              </button>
                              ?
                            </>
                          ) : undefined;
                        })()
                      : undefined
                  }
                />
                <TextField
                  label="Phone number"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={(v) => update({ phone: v })}
                  onBlur={() => touch("phone")}
                  error={
                    touched.phone && form.phone && !validatePhoneNumber(form.phone).valid
                      ? "That doesn't look like a valid phone number."
                      : undefined
                  }
                />
                <ChoiceField
                  label="Is the number above your WhatsApp number?"
                  options={YES_NO}
                  value={form.phoneIsWhatsapp}
                  onChange={(v) =>
                    update({
                      phoneIsWhatsapp: v as "Yes" | "No",
                      whatsapp: v === "Yes" ? undefined : form.whatsapp,
                    })
                  }
                />
                {form.phoneIsWhatsapp === "No" && (
                  <TextField
                    label="WhatsApp number"
                    type="tel"
                    placeholder="Your WhatsApp number"
                    value={form.whatsapp}
                    onChange={(v) => update({ whatsapp: v })}
                    onBlur={() => touch("whatsapp")}
                    error={
                      touched.whatsapp && form.whatsapp && !validatePhoneNumber(form.whatsapp).valid
                        ? "That doesn't look like a valid phone number."
                        : undefined
                    }
                  />
                )}
              </>
            )}

            {step === 3 && (
              <>
                <ChoiceField
                  label="Age range"
                  options={AGE_OPTIONS}
                  value={form.age}
                  onChange={(v) => update({ age: v })}
                />
                <ChoiceField
                  label="Are you a student?"
                  options={YES_NO}
                  value={form.isStudent}
                  onChange={(v) =>
                    update({
                      isStudent: v as "Yes" | "No",
                      level: v === "No" ? undefined : form.level,
                      levelOther: v === "No" ? undefined : form.levelOther,
                      courseOfStudy: v === "No" ? undefined : form.courseOfStudy,
                      institution: v === "No" ? undefined : form.institution,
                    })
                  }
                />
                {form.isStudent === "Yes" && (
                  <>
                    <ChoiceField
                      label="What is your level?"
                      options={LEVEL_OPTIONS}
                      value={form.level}
                      onChange={(v) =>
                        update({
                          level: v as RsvpPayload["level"],
                          levelOther: v === "Other" ? form.levelOther : undefined,
                        })
                      }
                    />
                    {form.level === "Other" && (
                      <TextField
                        label="Please specify"
                        placeholder="Your level"
                        value={form.levelOther}
                        onChange={(v) => update({ levelOther: v })}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <TextField
                  label="Course of study"
                  placeholder="e.g. Economics"
                  value={form.courseOfStudy}
                  onChange={(v) => update({ courseOfStudy: v })}
                />
                <TextField
                  label="School / Institution"
                  placeholder="e.g. Covenant University"
                  value={form.institution}
                  onChange={(v) => update({ institution: v })}
                />
              </>
            )}

            {step === 5 && (
              <>
                <ChoiceField
                  label="Are you coming with someone?"
                  options={YES_NO}
                  value={form.comingWithSomeone}
                  onChange={(v) =>
                    update({
                      comingWithSomeone: v as "Yes" | "No",
                      companionCount: v === "No" ? undefined : form.companionCount,
                    })
                  }
                />
                {form.comingWithSomeone === "Yes" && (
                  <TextField
                    label="How many people are you coming with?"
                    type="number"
                    placeholder="Number of people"
                    value={form.companionCount}
                    onChange={(v) => update({ companionCount: v })}
                  />
                )}
              </>
            )}

            {step === 6 && (
              <>
                <ChoiceField
                  label="How did you hear about this programme?"
                  options={HOW_HEARD_OPTIONS as string[]}
                  value={form.howHeard}
                  onChange={(v) =>
                    update({
                      howHeard: v as RsvpPayload["howHeard"],
                      howHeardOther: v === "Other" ? form.howHeardOther : undefined,
                    })
                  }
                />
                {form.howHeard === "Other" && (
                  <TextField
                    label="Please specify"
                    placeholder="How you heard about us"
                    value={form.howHeardOther}
                    onChange={(v) => update({ howHeardOther: v })}
                  />
                )}
                <ChoiceField
                  label="Would you like to receive updates about future WomanThatLeads programmes?"
                  options={YES_NO}
                  value={form.wantsUpdates}
                  onChange={(v) => update({ wantsUpdates: v as "Yes" | "No" })}
                />
              </>
            )}

            {step === 7 && <Review form={form} />}
          </div>

          {error && (
            <p className="mt-2 flex items-center gap-2 text-sm text-[#93372F]">
              <FlameMark className="h-3.5 w-2.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || submitting}
              className="border-b border-transparent px-1 py-2 text-sm text-[#8a7d6c] transition-colors hover:border-[#2A2018] hover:text-[#2A2018] disabled:opacity-30"
            >
              Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={next}
                className="rounded-full border border-[#3C1220] bg-[#3C1220] px-8 py-3 text-sm text-[#E9D6A8] transition-colors hover:bg-[#4E1A2B]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-full border border-[#3C1220] bg-[#3C1220] px-8 py-3 text-sm text-[#E9D6A8] transition-colors hover:bg-[#4E1A2B] disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function BrandPanel({ step }: { step: number }) {
  return (
    <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#3C1220] to-[#4E1A2B] px-8 py-10 text-[#FAF6EE] sm:px-10 md:py-12">
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(199,154,75,0.28), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Woman That Leads" style={{ height: '5rem', width: '10rem' }} />
        <p className={`${displayFont} max-w-[22ch] text-xl italic leading-[1.35] sm:text-2xl`}>
          "Leadership isn't a title <span className="text-[#E9D6A8]">— it's the room you choose to build.</span>"
        </p>
      </div>

      <ol className="relative z-10 mt-10 hidden flex-col md:flex">
        {STEP_TITLES.map((title, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={title} className="relative flex items-center gap-3.5 py-2.5 last:pb-0">
              {i < STEP_TITLES.length - 1 && (
                <span className="absolute left-[3px] top-7 h-5 w-px bg-[#FAF6EE]/15" aria-hidden="true" />
              )}
              <span
                className={`h-2 w-2 shrink-0 rounded-full border transition-all ${
                  done
                    ? "border-[#C79A4B] bg-[#C79A4B]"
                    : current
                    ? "border-[#C79A4B] bg-[#3C1220] ring-4 ring-[#C79A4B]/25"
                    : "border-[#FAF6EE]/35 bg-transparent"
                }`}
              />
              <span
                className={`text-sm ${
                  current ? "font-medium text-[#FAF6EE]" : done ? "text-[#FAF6EE]/85" : "text-[#FAF6EE]/40"
                }`}
              >
                {title}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <main
      className={`${fontVars} ${bodyFont} relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-[#FAF6EE] px-6 py-5 md:px-10`}
    >
      <div className="mx-auto flex w-full min-h-0 max-w-4xl flex-1 flex-col items-center justify-center gap-6 text-center md:flex-row md:items-center md:justify-center md:gap-32 md:text-left">
        {/* Flyer */}
        <div className="flex min-h-0 shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/travail-flyer.jpg"
            alt="Travail — Woman That Leads presents, 28th Nov 2026 at Olabisi Onabanjo University, Ogun State, 10am prompt"
            className="max-h-[40vh] w-auto rounded-lg object-contain shadow-[0_8px_30px_rgba(60,18,32,0.15)] md:max-h-[75vh]"
          />
        </div>

        {/* Copy */}
        <div className="flex shrink-0 flex-col items-center md:max-w-sm md:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-black.png" alt="Woman That Leads" className="h-auto w-24 sm:w-28 md:w-40" />

          <h1
            className={`${displayFont} mt-3 text-[26px] font-medium leading-[1.05] text-[#2A2018] sm:text-4xl md:mt-6 md:text-5xl`}
          >
            Registration 
            <br />
            is <em className="italic text-[#3C1220]">open</em>
          </h1>
          <span className="mt-2.5 h-[2px] w-14 bg-[#C79A4B] md:mt-4" aria-hidden="true" />

          <p className="mt-2.5 max-w-[30ch] text-[13px] leading-relaxed text-[#6c6152] sm:text-[15px] md:mt-4">
            We are excited to have you join us for an amazing time at She Leads Conference, OOU. Reserve your seat — it only takes a minute
          </p>

          <button
            type="button"
            onClick={onStart}
            className="mt-4 rounded-full border border-[#3C1220] bg-[#3C1220] px-8 py-2.5 text-sm tracking-wide text-[#E9D6A8] transition-colors hover:bg-[#4E1A2B] md:mt-6 md:px-10 md:py-3.5"
          >
            Register
          </button>
        </div>
      </div>
    </main>
  );
}

function Confirmation({ result, fullName }: { result: RsvpResponse; fullName: string }) {
  return (
    <main className={`${fontVars} ${bodyFont} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF6EE] px-6 py-16 text-center`}>
      <div className="relative z-10 flex max-w-sm flex-col items-center gap-6">
        <FlameMark className="h-10 w-7 text-[#3C1220]" />

        <h1 className={`${displayFont} text-4xl font-medium leading-[1.05] text-[#2A2018]`}>
          You&apos;re
          <br />
          <em className="italic text-[#3C1220]">registered</em>
        </h1>

        <p className="text-[15px] text-[#6c6152]">
          {fullName ? `${fullName}, ` : ""}your check-in QR just landed in your inbox. Show it at the door.
        </p>

        {result.qrDataUrl && (
          <div className="flex flex-col items-center gap-2 border border-[#C79A4B] bg-[#FFFEFA] px-7 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.qrDataUrl} alt="Your check-in QR code" className="h-44 w-44" />
            <span className="text-xs tracking-wide text-[#a68a56]">check-in pass</span>
          </div>
        )}

        {result.error && <p className="text-xs text-[#93372F]">{result.error}</p>}

        <p className="mt-2 flex items-center gap-2 text-xs tracking-wide text-[#a68a56]">
          <FlameMark className="h-3.5 w-2.5 text-[#C79A4B]" />
          See you there
        </p>
      </div>
    </main>
  );
}

function Review({ form }: { form: FormState }) {
  const rows: [string, string | undefined][] = [
    ["Title", form.title],
    ["Full name", form.fullName],
    ["Email", form.email],
    ["Phone", form.phone],
    ["Is phone WhatsApp?", form.phoneIsWhatsapp],
    ["WhatsApp", form.phoneIsWhatsapp === "Yes" ? form.phone : form.whatsapp],
    ["Age", form.age],
    ["Student?", form.isStudent],
    ["Level", form.level === "Other" ? form.levelOther : form.level],
    ...(form.isStudent === "Yes"
      ? ([
          ["Course of study", form.courseOfStudy],
          ["Institution", form.institution],
        ] as [string, string | undefined][])
      : []),
    ["Coming with someone?", form.comingWithSomeone],
    ["Number of companions", form.companionCount],
    ["How you heard", form.howHeard === "Other" ? form.howHeardOther : form.howHeard],
    ["Wants updates?", form.wantsUpdates],
  ];
  return (
    <div className="flex flex-col">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-start justify-between gap-3 border-b border-[#E6DCC8] py-2.5 text-sm"
        >
          <span className="shrink-0 text-[#8a7d6c]">{label}</span>
          <span className="break-all text-right text-[#2A2018]">{value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  error,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: React.ReactNode;
}) {
  return (
    <label className="mb-7 flex flex-col gap-2">
      <span className="text-[13px] text-[#7c6f5d]">{label}</span>
      <input
        type={type}
        inputMode={type === "tel" ? "tel" : undefined}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`border-0 border-b-[1.5px] bg-transparent px-0.5 py-2 text-[17px] text-[#2A2018] outline-none transition-colors placeholder:text-[#b8ab97] ${
          error ? "border-[#93372F]" : "border-[#E6DCC8] focus:border-[#C79A4B]"
        }`}
      />
      {error && <span className="text-xs text-[#93372F]">{error}</span>}
      {!error && hint && <span className="text-xs text-[#a68a56]">{hint}</span>}
    </label>
  );
}

function ChoiceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-7 flex flex-col gap-2.5">
      <span className="text-[13px] text-[#7c6f5d]">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-full border px-5 py-2 text-sm transition-colors ${
                active
                  ? "border-[#3C1220] bg-[#3C1220] text-[#E9D6A8]"
                  : "border-[#E6DCC8] text-[#2A2018] hover:border-[#C79A4B]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FlameMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0c1.2 4.3-3.1 5.4-3.1 9.4a3.1 3.1 0 0 0 6.2 0c0-1.1-.7-2-1.1-3 2.3 1.3 4.2 4.1 4.2 7.1a6.2 6.2 0 1 1-12.4 0C5.8 8.4 9 5 12 0Z" />
    </svg>
  );
}