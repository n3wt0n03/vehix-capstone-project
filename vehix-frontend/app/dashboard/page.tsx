"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession, type User } from "@/src/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = getSession();
    console.log("[dashboard] session:", session);

    const { token, user } = session;
    if (!token || !user) {
      console.log("[dashboard] no session, redirecting to login");
      router.replace("/login");
      return;
    }

    const role = user.user_roles?.role_name as string | undefined;
    if (role !== "admin" && role !== "staff") {
      console.log("[dashboard] no session, redirecting to login");
      router.replace("/login");
      return;
    }

    setUser(user);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  // Render nothing while the auth check is in progress
  if (!user) return null;

  const firstName = (user.firstName ?? user.name ?? "Admin") as string;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Vehix
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Page content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome back, {firstName}!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            You are signed in as an administrator.
          </p>
        </div>
      </div>
    </main>
  );
}
