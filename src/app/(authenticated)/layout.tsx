import DashboardHeader from "@/components/dashboard/header";
import VerifyEmailBanner from "@/components/auth/verify-email-banner";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-900 flex flex-col">
      <VerifyEmailBanner />
      <DashboardHeader />

      {children}
    </div>
  );
}
