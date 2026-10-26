import { readMeta } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { handle, HttpError, startSession } from "@/lib/auth";

export const POST = handle(async (req: Request) => {
  const { email, password } = await req.json();
  const user = (await readMeta()).users.find((u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase());
  if (!user || !user.active || !verifyPassword(String(password ?? ""), user.passwordHash))
    throw new HttpError(401, "Wrong email or password");
  await startSession(req, user.id);
  return { ok: true };
});
