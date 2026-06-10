import DashboardHeader from "@/components/dashboard/header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-900 flex flex-col">
      <DashboardHeader />

      {children}
    </div>
  );
}
