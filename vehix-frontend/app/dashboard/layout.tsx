"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/src/lib/auth";
import AdminNavbar from "@/src/components/AdminNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const { token, user } = getSession();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.user_roles as { role_name?: string } | undefined)
      ?.role_name;
    if (role !== "admin" && role !== "staff") {
      router.replace("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  // Render nothing until auth check completes — prevents flash of admin content
  if (!authorized) return null;

  return (
    <>
      <AdminNavbar />
      <div className="pt-16">{children}</div>
    </>
  );
}
