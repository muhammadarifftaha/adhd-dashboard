"use client";
import React from "react";
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
