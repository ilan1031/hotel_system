import "server-only";

// The owner (super admin) account. Other admins can't see it in Admin → Users and can't edit,
// reset or delete it; only the owner manages it. Set ADMIN_EMAIL to change which account it is.
export const OWNER_EMAIL = (process.env.ADMIN_EMAIL || "abielanabielan@gmail.com").trim().toLowerCase();

export const isOwner = (u?: { email: string } | null) => !!u && u.email.trim().toLowerCase() === OWNER_EMAIL;
