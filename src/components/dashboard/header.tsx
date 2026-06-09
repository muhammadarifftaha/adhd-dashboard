import React from "react";
import SignOutButton from "../auth/sign-out";

export default function DashboardHeader() {
  return (
    <header className="w-full h-16 bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-between px-4">
      <div>DashboardHeader</div>
      <div>
        <SignOutButton />
      </div>
    </header>
  );
}
