"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    if (!code) return;
    setBusy(true);
    setError(null);
    // verifyTotp / verifyBackupCode read the short-lived two-factor cookie set
    // during sign-in to identify the pending user and finish the session.
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      setBusy(false);
      setError(error.message ?? "Invalid code. Try again.");
      return;
    }
    // Full session established — go to the dashboard.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            {useBackup
              ? "Enter one of your backup codes."
              : "Enter the 6-digit code from your authenticator app."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
            className="flex flex-col gap-4"
          >
            <Field>
              <FieldLabel htmlFor="code">
                {useBackup ? "Backup code" : "Verification code"}
              </FieldLabel>
              <Input
                id="code"
                autoFocus
                autoComplete="one-time-code"
                inputMode={useBackup ? "text" : "numeric"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={!!error}
              />
              {error && <FieldError>{error}</FieldError>}
              <FieldDescription>
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-foreground"
                  onClick={() => {
                    setUseBackup((v) => !v);
                    setCode("");
                    setError(null);
                  }}
                >
                  {useBackup
                    ? "Use your authenticator app instead"
                    : "Lost your device? Use a backup code"}
                </button>
              </FieldDescription>
            </Field>
            <Button type="submit" disabled={busy || !code}>
              {busy && <Loader2Icon className="animate-spin" />}
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
