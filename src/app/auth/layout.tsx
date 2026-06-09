import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 relative">
      <AnimatedThemeToggler
        className="absolute top-4 right-4"
        variant="hexagon"
      />
      {children}
    </main>
  );
}
