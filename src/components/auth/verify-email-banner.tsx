"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useSession } from "@hooks/use-session";
import { Button } from "@components/ui/button";

export default function VerifyEmailBanner() {
  const { data } = useSession();
  const [sending, setSending] = useState(false);

  // Only for signed-in users who haven't verified their email yet.
  if (!data?.user || data.user.emailVerified) return null;

  const email = data.user.email;

  async function resend() {
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    });
    setSending(false);
    if (error) {
      toast.error(error.message ?? "Could not send the verification email.");
      return;
    }
    toast.success(`Verification email sent to ${email}.`);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <MailIcon className="h-4 w-4 shrink-0" />
        <span>Verify your email to secure your account.</span>
      </div>
      <Button variant="outline" size="sm" onClick={resend} disabled={sending}>
        {sending ? "Sending…" : "Resend email"}
      </Button>
    </div>
  );
}
