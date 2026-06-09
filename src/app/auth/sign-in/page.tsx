"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signIn } from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { SignInFormData, signInSchema } from "@/lib/schema/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignInPage() {
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const {
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = async (data: SignInFormData) => {
    form.clearErrors("root");
    const result = await signIn(data);
    // On success the action redirects; we only reach here on failure.
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to your account to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errors.root && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangleIcon className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <form className="w-full" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldSet>
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                    <Input
                      id={field.name}
                      {...field}
                      type="text"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Enter your username</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      {...field}
                      type="password"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Enter your password</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="rememberMe"
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                    <FieldLabel htmlFor={field.name}>Remember Me?</FieldLabel>
                  </Field>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
              <FieldSeparator />
              <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/sign-up"
                  className="font-medium text-zinc-950 dark:text-zinc-50 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Sign Up
                </Link>
              </p>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
