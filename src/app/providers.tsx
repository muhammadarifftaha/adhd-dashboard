import React from "react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      disableTransitionOnChange={true}
      enableSystem={true}
      attribute="class"
    >
      {children}
    </ThemeProvider>
  );
}
