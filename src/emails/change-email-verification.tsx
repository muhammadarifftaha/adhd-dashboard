import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";

import {
  buttonStyle,
  EmailLayout,
  headingStyle,
  linkFallbackStyle,
  textStyle,
} from "./components/email-layout";

type ChangeEmailVerificationProps = {
  url: string;
  newEmail: string;
  name?: string;
};

export default function ChangeEmailVerification({
  url,
  newEmail,
  name,
}: ChangeEmailVerificationProps) {
  return (
    <EmailLayout preview="Approve the email change for your ADHD Dashboard account">
      <Heading style={headingStyle}>Approve your email change</Heading>
      <Text style={textStyle}>
        {name ? `Hi ${name},` : "Hi,"} we received a request to change the email
        address on your ADHD Dashboard account to <strong>{newEmail}</strong>.
        Click the button below to approve this change.
      </Text>
      <Button href={url} style={buttonStyle}>
        Approve change
      </Button>
      <Text style={textStyle}>
        If you didn&apos;t request this change, you can ignore this email and
        your account email will stay the same.
      </Text>
      <Text style={textStyle}>Or paste this link into your browser:</Text>
      <Text style={linkFallbackStyle}>{url}</Text>
    </EmailLayout>
  );
}

ChangeEmailVerification.PreviewProps = {
  url: "https://app.example.com/verify-email-change?token=abc123",
  newEmail: "new.address@example.com",
  name: "Sam",
} satisfies ChangeEmailVerificationProps;
