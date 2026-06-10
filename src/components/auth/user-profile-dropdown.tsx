import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import {
  CircleQuestionMarkIcon,
  CogIcon,
  LogOutIcon,
  SlidersIcon,
} from "lucide-react";

import { Spinner } from "../ui/spinner";
import { useSession } from "@/hooks/use-session";

export default function UserProfileDropdown() {
  const { data, isPending, isRefetching } = useSession();
  const isLoading = isPending || isRefetching;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-lg">
            <Avatar>
              {isLoading ? (
                <Spinner className="w-6 h-6 text-neutral-500 mx-auto my-auto" />
              ) : (
                <>
                  <AvatarImage src={data?.user?.image || ""} />
                  <AvatarFallback className={"uppercase"}>
                    {data?.user?.userInitials}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/preferences" />}>
            <SlidersIcon className="mr-2" />
            App Preferences
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/account" />}>
            <CogIcon className="mr-2" />
            Account Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/help" />}>
            <CircleQuestionMarkIcon className="mr-2" />
            Help & Support
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/sign-out" />}>
            <LogOutIcon className="mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
