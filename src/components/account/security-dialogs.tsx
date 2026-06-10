"use client";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useSession } from "@hooks/use-session";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Field, FieldError, FieldLabel } from "@components/ui/field";
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

// Same strength rule as sign-up (letter + number + special, min 8). Better Auth
// re-validates server-side regardless; this is just for fast client feedback.
const STRONG_PASSWORD =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/;

const submitLabel = (isSubmitting: boolean, label: string) => (
  <>
    {isSubmitting && <Loader2Icon className="animate-spin" />}
    {isSubmitting ? "Saving…" : label}
  </>
);

/* ── Change email ─────────────────────────────────────────────────────── */

const emailSchema = z.object({
  newEmail: z.email("Invalid email address"),
});
type EmailValues = z.infer<typeof emailSchema>;

export function ChangeEmailDialog() {
  const [open, setOpen] = useState(false);
  const { refetch } = useSession();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: "" },
  });

  const onSubmit = async ({ newEmail }: EmailValues) => {
    const { error } = await authClient.changeEmail({ newEmail });
    if (error) {
      toast.error(error.message ?? "Could not change email.");
      return;
    }
    toast.success("Email updated.");
    await refetch();
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Change</Button>} />
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              Enter the new email address for your account.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="newEmail"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>New email</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline">Cancel</Button>}
            />
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel(isSubmitting, "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Change username ──────────────────────────────────────────────────── */

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Only letters, numbers, underscores, and dots are allowed",
    ),
});
type UsernameValues = z.infer<typeof usernameSchema>;

export function ChangeUsernameDialog() {
  const [open, setOpen] = useState(false);
  const { data, refetch } = useSession();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UsernameValues>({
    resolver: zodResolver(usernameSchema),
    // Prefill with the current username (re-syncs after a successful change).
    values: { username: data?.user?.username ?? "" },
  });

  const onSubmit = async ({ username }: UsernameValues) => {
    // The username plugin validates uniqueness on /update-user and returns
    // USERNAME_IS_ALREADY_TAKEN, surfaced here as error.message.
    const { error } = await authClient.updateUser({ username });
    if (error) {
      toast.error(error.message ?? "Could not update username.");
      return;
    }
    toast.success("Username updated.");
    await refetch();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Change</Button>} />
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Change username</DialogTitle>
            <DialogDescription>
              Pick a new username. It must be unique.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  type="text"
                  autoComplete="username"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline">Cancel</Button>}
            />
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel(isSubmitting, "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Change password ──────────────────────────────────────────────────── */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        STRONG_PASSWORD,
        "Must include a letter, a number, and a special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ currentPassword, newPassword }: PasswordValues) => {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      // Sign out other devices on a password change — a sensible security default.
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error(error.message ?? "Could not change password.");
      return;
    }
    toast.success("Password changed.");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline">Change Password</Button>}
      />
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Other signed-in devices will be signed out.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="currentPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Current password</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="newPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline">Cancel</Button>}
            />
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel(isSubmitting, "Change password")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
