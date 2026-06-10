import AuthCard from "@/components/account/auth-card";
import ProfileCard from "@/components/account/profile-card";
import React from "react";

export default function UserProfile() {
  return (
    <main className="flex flex-col justify-start items-start flex-auto px-4 py-4 gap-4">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      <div className="flex flex-col md:flex-row justify-start items-start flex-auto gap-4">
        <ProfileCard />
        <AuthCard />
        {/* Add more account-related cards here */}
      </div>
    </main>
  );
}
