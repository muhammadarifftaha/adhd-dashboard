"use client";
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { LogOutIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    router.push("/auth/sign-in");
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOutIcon />
            <span className="sr-only">Sign Out</span>
          </Button>
        }
      />
      <TooltipContent>Sign Out</TooltipContent>
    </Tooltip>
  );
}
