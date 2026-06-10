import { Heading, Text } from "@react-email/components";
import * as React from "react";
import {
  EmailLayout,
  headingStyle,
  textStyle,
} from "./components/email-layout";

// Security notification (no action required) sent to the account email after a
// username change, so a silent takeover can't go unnoticed.
export default function UsernameChangedEmail({
  username,
  name,
}: {
  username: string;
  name?: string;
}) {
  return (
    <EmailLayout preview="Your username was changed">
      <Heading style={headingStyle}>Your username was changed</Heading>
      <Text style={textStyle}>
        {name ? `Hi ${name},` : "Hi there,"} the username on your ADHD Dashboard
        account is now <strong>{username}</strong>.
      </Text>
      <Text style={textStyle}>
        If you made this change, no action is needed. If you didn&apos;t, change
        your password right away to secure your account.
      </Text>
    </EmailLayout>
  );
}

UsernameChangedEmail.PreviewProps = {
  username: "new_handle",
  name: "Sam",
};
