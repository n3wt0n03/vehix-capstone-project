"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/src/lib/auth";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Vehicles", href: "/dashboard/vehicles" },
  { label: "Reservations", href: "/dashboard/reservations" },
] as const;

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [firstName, setFirstName] = useState("Admin");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const { user } = getSession();
    if (user) {
      setFirstName(
        (user.first_name as string) ?? (user.firstName as string) ?? "Admin"
      );
    }
  }, []);

  function handleLogout() {
    clearSession();
    setMenuOpen(false);
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-full bg-slate-800 shadow-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight text-white"
          >
            VEHIX{" "}
            <span className="text-sm font-normal text-slate-400">Admin</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(href)
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side — name + logout */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-slate-300">{firstName}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-1.5 p-1 text-white md:hidden"
            aria-label="Toggle menu"
          >
            <span
              className={`block h-0.5 w-6 rounded bg-current transition-all ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 rounded bg-current transition-all ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 rounded bg-current transition-all ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-700 bg-slate-800 px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(href)
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-3">
              <span className="text-sm text-slate-400">{firstName}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
