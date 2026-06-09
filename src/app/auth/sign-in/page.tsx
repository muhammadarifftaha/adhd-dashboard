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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function SignInPage() {
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
          <form>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input id="username" name="username" type="text" />
                  <FieldDescription>Enter your username</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input id="password" name="password" type="password" />
                  <FieldDescription>Enter your password</FieldDescription>
                </Field>

                <Field orientation="horizontal">
                  <FieldLabel htmlFor="remember">Remember Me?</FieldLabel>
                  <Checkbox id="remember" name="remember" />
                </Field>
                <Button type="submit" className="w-full">
                  Sign In
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
              </FieldGroup>
            </FieldSet>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
