"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/src/lib/api";
import type { Vehicle } from "@/src/types/vehicle";
import CustomerNavbar from "@/src/components/CustomerNavbar";

const FILTERS = ["All", "Available", "Rented", "Maintenance"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLES: Record<Vehicle["status"], string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700",
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  useEffect(() => {
    api
      .get("/api/vehicles")
      .then((res) => {
        const data = res.data;
        setVehicles(
          Array.isArray(data) ? data : (data?.data ?? data?.vehicles ?? [])
        );
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeFilter === "All"
      ? vehicles
      : vehicles.filter(
          (v) => v.status.toLowerCase() === activeFilter.toLowerCase()
        );

  return (
    <>
      <CustomerNavbar />
      <main className="min-h-screen bg-gray-50 pt-16">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Our Fleet</h1>
            <p className="mt-1 text-base text-slate-500">
              Browse our available vehicles
            </p>
          </div>

          {/* Filter tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {f}
                {!loading && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      activeFilter === f
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {f === "All"
                      ? vehicles.length
                      : vehicles.filter(
                          (v) => v.status.toLowerCase() === f.toLowerCase()
                        ).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 text-center shadow-sm">
              <p className="text-lg font-medium text-slate-900">
                No vehicles found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {activeFilter !== "All"
                  ? `There are no ${activeFilter.toLowerCase()} vehicles.`
                  : "No vehicles are listed yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((v) => (
                <VehicleCard key={v.car_id} vehicle={v} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const isAvailable = v.status === "available";

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
          <span className="text-4xl text-gray-300">🚗</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">
              {v.brand} {v.model}
            </p>
            <p className="text-sm text-slate-500">{v.year}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[v.status]}`}
          >
            {v.status}
          </span>
        </div>

        {/* Details */}
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

        {/* Rate */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <span className="text-lg font-bold text-slate-900">
            ₱{v.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            <span className="text-sm font-normal text-slate-500">/day</span>
          </span>
        </div>

        {/* Action button */}
        {isAvailable ? (
          <Link
            href="/booking"
            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            Book Now
          </Link>
        ) : (
          <button
            disabled
            className="mt-3 w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}
