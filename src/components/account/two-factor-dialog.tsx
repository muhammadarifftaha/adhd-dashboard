"use client";
import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useSession } from "@hooks/use-session";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";

type SetupData = { totpURI: string; backupCodes: string[] };

// Pull the raw secret out of the otpauth:// URI for manual entry (when a user
// can't scan the QR).
function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const { refetch } = useSession();

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Present only during the enable flow, after the secret has been generated.
  const [setup, setSetup] = useState<SetupData | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset wizard state when the dialog closes.
      setPassword("");
      setCode("");
      setSetup(null);
      setBusy(false);
    }
  }

  async function startEnable() {
    if (!password) return;
    setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not start 2FA setup.");
      return;
    }
    setSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  }

  async function confirmEnable() {
    if (!code) return;
    setBusy(true);
    // verifyTotp flips twoFactorEnabled to true only once a valid code proves
    // the authenticator is set up.
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Invalid code. Try again.");
      return;
    }
    toast.success("Two-factor authentication enabled.");
    await refetch();
    handleOpenChange(false);
  }

  async function disable() {
    if (!password) return;
    setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? "Could not disable 2FA.");
      return;
    }
    toast.success("Two-factor authentication disabled.");
    await refetch();
    handleOpenChange(false);
  }

  async function copyBackupCodes() {
    if (!setup) return;
    await navigator.clipboard.writeText(setup.backupCodes.join("\n"));
    toast.success("Backup codes copied.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">{enabled ? "Manage 2FA" : "Enable 2FA"}</Button>
        }
      />
      <DialogContent>
        {/* ── Disable ─────────────────────────────────────────────── */}
        {enabled ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Disable two-factor authentication</DialogTitle>
              <DialogDescription>
                Enter your password to turn off 2FA for your account.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="tf-password">Password</FieldLabel>
              <Input
                id="tf-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline">Cancel</Button>}
              />
              <Button
                type="button"
                variant="destructive"
                onClick={disable}
                disabled={busy || !password}
              >
                {busy && <Loader2Icon className="animate-spin" />}
                {busy ? "Disabling…" : "Disable 2FA"}
              </Button>
            </DialogFooter>
          </div>
        ) : setup ? (
          /* ── Enable step 2: scan + verify ──────────────────────── */
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Scan the QR code</DialogTitle>
              <DialogDescription>
                Scan this with your authenticator app, then enter the 6-digit
                code to finish.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center rounded-lg bg-white p-4">
              <QRCode value={setup.totpURI} size={160} />
            </div>
            <p className="text-xs text-muted-foreground break-all text-center">
              Can&apos;t scan? Enter this key manually:{" "}
              <span className="font-mono">{secretFromUri(setup.totpURI)}</span>
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Backup codes</p>
              <p className="text-xs text-muted-foreground">
                Save these somewhere safe — each works once if you lose your
                device.
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-md border bg-muted/50 p-3 font-mono text-sm">
                {setup.backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBackupCodes}
              >
                Copy codes
              </Button>
            </div>

            <Field>
              <FieldLabel htmlFor="tf-code">Verification code</FieldLabel>
              <Input
                id="tf-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <FieldDescription>
                Enter the 6-digit code from your authenticator app.
              </FieldDescription>
            </Field>

            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline">Cancel</Button>}
              />
              <Button
                type="button"
                onClick={confirmEnable}
                disabled={busy || code.length < 6}
              >
                {busy && <Loader2Icon className="animate-spin" />}
                {busy ? "Verifying…" : "Enable 2FA"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Enable step 1: password ───────────────────────────── */
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Enable two-factor authentication</DialogTitle>
              <DialogDescription>
                Confirm your password to start setting up 2FA.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="tf-password">Password</FieldLabel>
              <Input
                id="tf-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline">Cancel</Button>}
              />
              <Button
                type="button"
                onClick={startEnable}
                disabled={busy || !password}
              >
                {busy && <Loader2Icon className="animate-spin" />}
                {busy ? "Starting…" : "Continue"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
