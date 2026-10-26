import { AppShell } from "@/components/app-shell";

// Screens wait for the signed-in user before rendering, so navigation into them may block.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
