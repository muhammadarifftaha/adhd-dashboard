"use client";
import React from "react";
import SignOutButton from "../auth/sign-out";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import UserProfileDropdown from "../auth/user-profile-dropdown";

export default function DashboardHeader() {
  return (
    <header className="w-full h-16 bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-between px-4">
      <div>DashboardHeader</div>
      <div className="flex items-center gap-4">
        <UserProfileDropdown />
      </div>
    </header>
  );
}
