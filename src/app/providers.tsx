"use client";
import React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      disableTransitionOnChange={true}
      enableSystem={true}
      attribute="class"
    >
      <TooltipProvider>{children}</TooltipProvider>
      {/* Mounted inside ThemeProvider so toasts follow the active theme. */}
      <Toaster />
    </ThemeProvider>
  );
}
