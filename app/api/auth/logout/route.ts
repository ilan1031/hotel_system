import { endSession, handle } from "@/lib/auth";

export const POST = handle(async () => {
  await endSession();
});
