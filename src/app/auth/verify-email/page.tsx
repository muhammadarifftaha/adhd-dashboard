import Link from "next/link";
import { MailCheckIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900 w-full">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailCheckIcon className="h-5 w-5 text-primary" />
            <CardTitle>Check your email</CardTitle>
          </div>
          <CardDescription>
            We sent a verification link to your email address. Click it to finish
            signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or{" "}
            <Link
              href="/auth/sign-in"
              className="font-medium underline underline-offset-4 hover:text-foreground"
            >
              try signing in again
            </Link>{" "}
            to resend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
