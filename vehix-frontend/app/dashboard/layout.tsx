"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import AdminNavbar from "@/src/components/AdminNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const { token, user } = getSession();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.user_roles as { role_name?: string } | undefined)
      ?.role_name;
    if (role !== "admin" && role !== "staff") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <>
      <AdminNavbar />
      <div className="pt-16">{children}</div>
    </>
  );
}
