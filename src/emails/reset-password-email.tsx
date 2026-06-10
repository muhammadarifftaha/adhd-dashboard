import { Button, Heading, Link, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  buttonStyle,
  headingStyle,
  linkFallbackStyle,
  textStyle,
} from "./components/email-layout";

export default function ResetPasswordEmail({
  url,
  name,
}: {
  url: string;
  name?: string;
}) {
  return (
    <EmailLayout preview="Reset your ADHD Dashboard password">
      <Heading style={headingStyle}>Reset your password</Heading>
      <Text style={textStyle}>
        Hi{name ? ` ${name}` : ""}, we received a request to reset the password
        for your ADHD Dashboard account. Click the button below to choose a new
        password.
      </Text>
      <Button href={url} style={buttonStyle}>
        Reset password
      </Button>
      <Text style={textStyle}>
        This link will expire soon, so be sure to use it right away. If you
        didn&apos;t request a password reset, you can safely ignore this email
        and your password will stay the same.
      </Text>
      <Text style={linkFallbackStyle}>
        Or paste this link into your browser:
      </Text>
      <Link href={url} style={linkFallbackStyle}>
        {url}
      </Link>
    </EmailLayout>
  );
}

ResetPasswordEmail.PreviewProps = {
  url: "https://app.example.com/reset-password?token=abc123",
  name: "Sam",
};
