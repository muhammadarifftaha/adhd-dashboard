import DashboardHeader from "@/components/dashboard/header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <DashboardHeader />

      {children}
    </main>
  );
}
