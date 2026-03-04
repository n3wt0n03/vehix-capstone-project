"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";
import type { Vehicle } from "@/src/types/vehicle";
import CustomerNavbar from "@/src/components/CustomerNavbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <CustomerNavbar />
      <HeroSection />
      <AboutSection />
      <FleetSection />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <span className="mb-4 inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
          Premium Car Rental Service
        </span>

        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your Journey Starts Here
        </h1>

        <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
          Reliable, affordable, and hassle-free car rentals for every adventure
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/booking"
            className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            Book Now
          </Link>
          <Link
            href="/fleet"
            className="rounded-xl border border-white/50 bg-white/10 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            View Fleet
          </Link>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="h-6 w-6 text-white/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ABOUT
───────────────────────────────────────────── */
function AboutSection() {
  const stats = [
    { value: "500+", label: "Happy Customers" },
    { value: "50+", label: "Premium Vehicles" },
    { value: "5+", label: "Years of Service" },
  ];

  return (
    <section id="about" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left — text */}
          <div className="flex-1">
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              About Us
            </span>
            <h2 className="mt-3 text-3xl font-bold leading-snug text-slate-900 sm:text-4xl">
              Driven by Excellence,{" "}
              <span className="text-blue-600">Powered by Trust</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-500">
              We are a premier car rental service committed to providing our
              customers with the finest vehicles and exceptional service. With a
              modern fleet and dedicated team, we ensure every journey is
              comfortable, safe, and memorable.
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center"
                >
                  <p className="text-2xl font-extrabold text-blue-600">
                    {value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — image */}
          <div className="flex-1">
            <img
              src="https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"
              alt="Premium car"
              className="w-full rounded-3xl object-cover shadow-xl"
              style={{ maxHeight: "420px" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FLEET
───────────────────────────────────────────── */
function FleetSection() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/vehicles?status=available")
      .then((res) => {
        const data = res.data;
        const list: Vehicle[] = Array.isArray(data)
          ? data
          : (data?.data ?? data?.vehicles ?? []);
        setVehicles(list.slice(0, 6));
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="fleet" className="bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div className="mb-12 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Our Fleet
          </span>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Choose Your Ride
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Choose from our wide selection of vehicles
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-3 rounded bg-gray-200" />
                    <div className="h-3 rounded bg-gray-200" />
                    <div className="h-3 rounded bg-gray-200" />
                  </div>
                  <div className="h-9 rounded-lg bg-gray-200 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-slate-900">
              No vehicles available right now
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon for our latest fleet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <FleetCard
                key={v.car_id}
                vehicle={v}
                onBook={() => router.push("/booking")}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {!loading && vehicles.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/fleet"
              className="inline-block rounded-xl border border-blue-600 px-8 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View All Vehicles
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function FleetCard({
  vehicle: v,
  onBook,
}: {
  vehicle: Vehicle;
  onBook: () => void;
}) {
  const statusStyles: Record<Vehicle["status"], string> = {
    available: "bg-green-100 text-green-700",
    rented: "bg-blue-100 text-blue-700",
    maintenance: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Image */}
      <div className="h-44 bg-gray-100 flex items-center justify-center">
        {v.image ? (
          <img
            src={v.image}
            alt={`${v.brand} ${v.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl text-gray-300">🚗</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">
              {v.brand} {v.model}
            </p>
            <p className="text-sm text-slate-500">{v.year}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[v.status]}`}
          >
            {v.status}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          {[
            ["Transmission", v.transmission],
            ["Fuel", v.fuel_type],
            ["Capacity", `${v.capacity} seats`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-400">{label}</dt>
              <dd className="font-medium text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">
            ₱{v.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            <span className="text-sm font-normal text-slate-500">/day</span>
          </span>
        </div>

        <button
          onClick={onBook}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <footer className="bg-slate-800 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Col 1 — Brand */}
          <div>
            <p className="text-2xl font-bold tracking-tight text-white">
              VEHIX
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Your trusted partner for premium car rentals. We make every
              journey comfortable, safe, and memorable.
            </p>
          </div>

          {/* Col 2 — Quick links */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white">
              Quick Links
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="hover:text-white transition"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo("about")}
                  className="hover:text-white transition"
                >
                  About Us
                </button>
              </li>
              <li>
                <Link href="/fleet" className="hover:text-white transition">
                  Fleet
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Contact */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white">
              Contact
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-slate-500">📞</span>
                <span>+63 912 345 6789</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-slate-500">✉️</span>
                <span>support@vehix.ph</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-slate-500">📍</span>
                <span>123 Bonifacio Ave, Taguig City, Metro Manila</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-700">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-slate-500">
          © 2026 Vehix. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
