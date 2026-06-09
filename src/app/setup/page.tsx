"use client";

import { signUpAdmin } from "./actions";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangleIcon, EyeIcon, Loader2Icon } from "lucide-react";
import { SignUpAdminFormData, signUpAdminSchema } from "@/lib/schema/admin";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function SetupPage() {
  const form = useForm<SignUpAdminFormData>({
    resolver: zodResolver(signUpAdminSchema),
    defaultValues: {
      username: "",
      password: "",
      matchPassword: "",
      email: "",
      name: "",
      displayUsername: "",
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = form;

  const onSubmit = async (data: SignUpAdminFormData) => {
    form.clearErrors("root");
    const result = await signUpAdmin(data);
    // On success the action redirects; we only reach here on failure.
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Create an Admin Account</CardTitle>
          <CardDescription>
            It looks like this is your first time setting up the dashboard.
            Please create an admin account to get started.
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
          <form className="w-full" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Email <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your email"
                  />
                  <FieldDescription>Enter your email address</FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Name
                    <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your name"
                  />
                  <FieldDescription>Enter your name</FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <FieldSet>
              <FieldGroup className="flex-row">
                <Controller
                  name="username"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Username
                        <span className="text-red-500">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="admin"
                        type="text"
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
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Display Name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="Display Name"
                        type="text"
                      />
                      <FieldDescription>
                        Enter your display name (optional)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <FieldGroup className="flex-row">
                <Controller
                  name="password"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name} aria-required="true">
                        Password <span className="text-red-500">*</span>
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          type="password"
                        />
                        <InputGroupButton
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(
                              field.name,
                            ) as HTMLInputElement | null;
                            if (input) {
                              if (input.type === "password") {
                                input.type = "text";
                              } else {
                                input.type = "password";
                              }
                            }
                          }}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </InputGroupButton>
                      </InputGroup>
                      <FieldDescription>Enter your password</FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="matchPassword"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Confirm Password <span className="text-red-500">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        type="password"
                      />
                      <FieldDescription>
                        Enter your password again
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <FieldSeparator />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />}
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
