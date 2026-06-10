import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  buttonStyle,
  headingStyle,
  linkFallbackStyle,
  textStyle,
} from "./components/email-layout";

export default function VerificationEmail({
  url,
  name,
}: {
  url: string;
  name?: string;
}) {
  return (
    <EmailLayout preview="Verify your email address to finish setting up your account">
      <Heading style={headingStyle}>Verify your email</Heading>
      <Text style={textStyle}>
        {name ? `Hi ${name},` : "Hi there,"} confirm your email address to
        finish setting up your ADHD Dashboard account. This helps us keep your
        account secure.
      </Text>
      <Button href={url} style={buttonStyle}>
        Verify email
      </Button>
      <Text style={linkFallbackStyle}>
        Or paste this link into your browser:
      </Text>
      <Text style={linkFallbackStyle}>{url}</Text>
    </EmailLayout>
  );
}

VerificationEmail.PreviewProps = {
  url: "https://app.example.com/verify?token=abc123",
  name: "Sam",
};
