/**
 * Formats a Date as "YYYY-MM-DD HH:mm:ss" in West Africa Time (Africa/Lagos,
 * UTC+1 year-round — no DST to worry about). Used instead of
 * Date#toISOString(), which is always UTC and would show times an hour
 * behind for anyone reading the sheet in Nigeria.
 */
export function formatLagosTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}