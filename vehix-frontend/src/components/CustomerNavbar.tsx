"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/src/lib/auth";

export default function CustomerNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect scroll to swap transparent → white
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Check logged-in user
  useEffect(() => {
    const { user } = getSession();
    if (user) {
      setFirstName((user.first_name as string) ?? (user.firstName as string) ?? null);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearSession();
    setFirstName(null);
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push("/login");
  }

  function scrollTo(id: string) {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`/#${id}`);
    }
  }

  const navLinks = (
    <>
      <Link
        href="/"
        onClick={() => setMenuOpen(false)}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
      >
        Home
      </Link>
      <button
        onClick={() => scrollTo("about")}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
      >
        About Us
      </button>
      <Link
        href="/fleet"
        onClick={() => setMenuOpen(false)}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition"
      >
        Fleet
      </Link>
    </>
  );

  return (
    <nav
      className={`fixed top-0 left-0 z-50 w-full bg-white border-b border-gray-200 transition-all duration-300 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-slate-800"
          >
            VEHIX
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 text-slate-700 md:flex">
            {navLinks}

            {firstName ? (
              /* Logged-in user button + dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  {firstName}
                  <svg
                    className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                    <Link
                      href="/my-bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Bookings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/register"
                  className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50 transition"
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex flex-col justify-center gap-1.5 p-1 text-slate-800 md:hidden"
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
        <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-4 pt-4 text-gray-700">
            {navLinks}
            {firstName ? (
              <>
                <Link
                  href="/my-bookings"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  My Bookings
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-fit rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
