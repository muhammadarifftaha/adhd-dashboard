"use client";
import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useSession } from "@/hooks/use-session";
import {
  ChangeEmailDialog,
  ChangeUsernameDialog,
  ChangePasswordDialog,
} from "./security-dialogs";
import { Field, FieldContent, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { TwoFactorDialog } from "./two-factor-dialog";
import { ShieldCheckIcon, ShieldOffIcon } from "lucide-react";

export default function AuthCard() {
  const { data, isPending, isRefetching } = useSession();
  const isLoading = isPending || isRefetching;
  const twoFactorEnabled = !!data?.user?.twoFactorEnabled;
  return (
    <Card className="col-span-2 row-span-1">
      <CardHeader>
        <CardTitle>Account Security</CardTitle>
        <CardDescription>
          Manage your password, 2FA, and other security settings to keep your
          account safe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-4 w-full">
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldContent className="flex gap-2 flex-row">
            <Input
              value={isLoading ? "Loading..." : data?.user?.email || ""}
              readOnly
              disabled
            />
            <ChangeEmailDialog />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Username</FieldLabel>
          <FieldContent className="flex gap-2 flex-row">
            <Input
              value={isLoading ? "Loading..." : data?.user?.username || ""}
              readOnly
              disabled
            />
            <ChangeUsernameDialog />
          </FieldContent>
        </Field>
        <Field orientation="horizontal">
          <FieldLabel>Two Factor Authentication (2FA)</FieldLabel>
          <div className="flex items-center gap-1">
            {twoFactorEnabled ? (
              <>
                <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                <p>Enabled</p>
              </>
            ) : (
              <>
                <ShieldOffIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-muted-foreground">Disabled</p>
              </>
            )}
          </div>
          <TwoFactorDialog enabled={twoFactorEnabled} />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel>Password</FieldLabel>
          <ChangePasswordDialog />
        </Field>
      </CardContent>
    </Card>
  );
}
