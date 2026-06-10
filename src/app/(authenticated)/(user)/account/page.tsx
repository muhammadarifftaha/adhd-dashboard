import AuthCard from "@/components/account/auth-card";
import ProfileCard from "@/components/account/profile-card";
import React from "react";

export default function UserProfile() {
  return (
    <main className="grid grid-cols-4 flex-auto px-4 py-4 grid-rows-3 gap-4">
      <ProfileCard />
      <AuthCard />
    </main>
  );
}
