import { write } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { currentUser, handle, HttpError, requireUser } from "@/lib/auth";

export const GET = handle(async () => ({ me: await currentUser() }));

// Change own password
export const PATCH = handle(async (req: Request) => {
  const me = await requireUser();
  const { current, next } = await req.json();
  if (String(next ?? "").length < 6) throw new HttpError(400, "Min 6 characters");
  await write((db) => {
    const u = db.users.find((x) => x.id === me.id)!;
    if (!verifyPassword(String(current ?? ""), u.passwordHash)) throw new HttpError(400, "Current password wrong");
    u.passwordHash = hashPassword(next);
  });
});
