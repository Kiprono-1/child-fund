/**
 * Admin shell layout — neutral wrapper, no public site header/footer.
 * Auth is enforced in src/app/admin/(protected)/layout.tsx.
 */
import type { ReactNode } from "react";

export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
