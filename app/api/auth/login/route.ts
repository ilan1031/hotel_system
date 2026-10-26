import { addLogin, readMeta, uid } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { handle, HttpError, startSession } from "@/lib/auth";
import { readDevice, readPlace } from "@/lib/audit";

export const POST = handle(async (req: Request) => {
  const { email, password } = await req.json();
  const typed = String(email ?? "").trim().toLowerCase().slice(0, 120);
  const user = (await readMeta()).users.find((u) => u.email.toLowerCase() === typed);
  const ok = !!user && user.active && verifyPassword(String(password ?? ""), user.passwordHash);

  // every attempt goes to the owner's login audit, failed ones included
  await addLogin({
    id: uid("l"),
    at: Date.now(),
    ok,
    email: typed,
    userId: user?.id,
    name: user?.name,
    ...readPlace(req.headers),
    device: readDevice(req.headers),
    ua: req.headers.get("user-agent")?.slice(0, 300) ?? undefined,
  }).catch((e) => console.error("login audit failed", e)); // never block sign-in on the audit

  if (!ok) throw new HttpError(401, "Wrong email or password");
  await startSession(req, user.id);
  return { ok: true };
});
