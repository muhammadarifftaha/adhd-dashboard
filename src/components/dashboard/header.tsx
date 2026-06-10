"use client";
import React from "react";
import UserProfileDropdown from "../auth/user-profile-dropdown";
import Link from "next/link";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";

export default function DashboardHeader() {
  return (
    <header className="w-full h-16 bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-between px-4">
      <Link href="/">
        <h1 className="text-xl font-bold">ADHD Dashboard</h1>
      </Link>
      <div className="flex items-center gap-4">
        <AnimatedThemeToggler />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
