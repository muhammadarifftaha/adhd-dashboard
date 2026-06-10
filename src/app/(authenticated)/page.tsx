import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardGrid from "@components/dashboard/dashboard-grid";
import {
  DEFAULT_LAYOUTS,
  normalizeDashboardLayouts,
} from "@lib/schema/dashboard";

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });

  // The (authenticated) layout guarantees a session, but read defensively.
  const settings = session
    ? await prisma.userSettings.findUnique({
        where: { id: session.user.id },
        select: { dashboardLayout: true },
      })
    : null;

  // Coerce stored JSON (possibly null/stale) into a complete, validated layout.
  const initialLayouts = settings?.dashboardLayout
    ? normalizeDashboardLayouts(settings.dashboardLayout)
    : DEFAULT_LAYOUTS;

  return (
    <main className="w-full flex-auto p-4">
      <DashboardGrid initialLayouts={initialLayouts} />
    </main>
  );
}
