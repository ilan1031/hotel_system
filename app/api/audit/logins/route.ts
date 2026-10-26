import { readLogins } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { dayRange, today } from "@/lib/time";

// Login audit for a restaurant-local day — the owner only.
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  if (!me.owner) throw new HttpError(404, "Not found");
  const day = new URL(req.url).searchParams.get("day");
  const { from, to } = dayRange(day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today());
  return readLogins(from, to);
});
