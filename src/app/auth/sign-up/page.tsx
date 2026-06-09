"use client";

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
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signUp } from "../actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { SignUpFormData, signUpSchema } from "@/lib/schema/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignUpPage() {
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      displayUsername: "",
      matchPassword: "",
      name: "",
    },
  });

  const {
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = async (data: SignUpFormData) => {
    form.clearErrors("root");
    const result = await signUp(data);
    // On success the action redirects; we only reach here on failure.
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>
            Create an account to access the dashboard.
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
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      {...field}
                      type="text"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Enter your name</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      {...field}
                      type="email"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Enter your email address</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <FieldGroup className="grid md:grid-cols-2 gap-4">
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
                  name="displayUsername"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Display Username (optional)
                      </FieldLabel>
                      <Input
                        id={field.name}
                        {...field}
                        type="text"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        Enter a display username (optional)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <FieldGroup className="grid md:grid-cols-2 gap-4">
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
                  name="matchPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Confirm Password
                      </FieldLabel>
                      <Input
                        id={field.name}
                        {...field}
                        type="password"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>Confirm your password</FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? "Signing Up..." : "Sign Up"}
              </Button>
              <FieldSeparator />
              <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
                Already have an account?{" "}
                <Link
                  href="/auth/sign-in"
                  className="font-medium text-zinc-950 dark:text-zinc-50 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Sign In
                </Link>
              </p>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
