import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// Email clients ignore <style>/external CSS, so everything here is inline.
const main: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "32px 0",
};
const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #ebebeb",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "480px",
  padding: "32px",
};
const brand: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 24px",
};
const footer: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};
const hr: React.CSSProperties = {
  borderColor: "#ebebeb",
  margin: "28px 0 20px",
};

/** Shared wrapper: brand header, body slot, and a muted footer. */
export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ADHD Dashboard</Text>
          <Section>{children}</Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles reused by the action button + raw-link fallback across templates.
export const buttonStyle: React.CSSProperties = {
  backgroundColor: "#171717",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
};
export const textStyle: React.CSSProperties = {
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "22px",
};
export const headingStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  margin: "0 0 12px",
};
export const linkFallbackStyle: React.CSSProperties = {
  color: "#8a8a8a",
  fontSize: "12px",
  lineHeight: "18px",
  wordBreak: "break-all",
};
