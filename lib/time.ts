// Restaurant-local days. Vercel servers run in UTC, so "today" and day ranges use a fixed
// offset from UTC (India: +330 minutes) instead of the server clock's time zone.
const OFFSET_MS = Number(process.env.APP_UTC_OFFSET_MINUTES ?? 330) * 60_000;

/** "YYYY-MM-DD" for the restaurant's current day. */
export const today = () => new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);

/** [start, end) in epoch ms for a restaurant-local "YYYY-MM-DD". */
export function dayRange(day: string) {
  const start = Date.parse(day + "T00:00:00Z") - OFFSET_MS;
  return { from: start, to: start + 86_400_000 };
}
