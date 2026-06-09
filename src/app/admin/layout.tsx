import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Server-side RBAC for the entire /admin subtree. The proxy only checks for a
 * session (presence), not the role, and proxy matching can be bypassed — so
 * authorization is enforced here. First-run setup lives at /setup (outside
 * /admin), so this guard never blocks bootstrap.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
