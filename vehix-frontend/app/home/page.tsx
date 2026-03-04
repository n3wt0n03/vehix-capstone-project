"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";
import type { Vehicle } from "@/src/types/vehicle";
import CustomerNavbar from "@/src/components/CustomerNavbar";

const FILTERS = ["All", "Sedan", "SUV", "Van"] as const;
type Filter = (typeof FILTERS)[number];

export default function HomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  useEffect(() => {
    api
      .get("/api/vehicles?status=available")
      .then((res) => {
        const data = res.data;
        setVehicles(Array.isArray(data) ? data : (data?.data ?? data?.vehicles ?? []));
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeFilter === "All"
      ? vehicles
      : vehicles.filter(
          (v) => v.model.toLowerCase().includes(activeFilter.toLowerCase())
        );

  return (
    <>
      <CustomerNavbar />
      <main className="min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Available Vehicles
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and book a vehicle for your trip.
          </p>
        </div>

        {/* Filter buttons */}
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
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">
              Loading vehicles…
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-gray-900">
              No vehicles available
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Check back later or try a different filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((vehicle) => (
              <VehicleCard key={vehicle.car_id} vehicle={vehicle} onBook={() => router.push(`/booking/${vehicle.car_id}`)} />
            ))}
          </div>
        )}
      </div>
    </main>
    </>
  );
}

function VehicleCard({ vehicle, onBook }: { vehicle: Vehicle; onBook: () => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Image */}
      <div className="h-44 bg-gray-100 flex items-center justify-center">
        {vehicle.image ? (
          <img
            src={vehicle.image}
            alt={`${vehicle.brand} ${vehicle.model}`}
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
            <p className="font-semibold text-gray-900">
              {vehicle.brand} {vehicle.model}
            </p>
            <p className="text-sm text-gray-500">{vehicle.year}</p>
          </div>
          <StatusBadge status={vehicle.status} />
        </div>

        {/* Details */}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <Detail label="Transmission" value={vehicle.transmission} />
          <Detail label="Fuel" value={vehicle.fuel_type} />
          <Detail label="Capacity" value={`${vehicle.capacity} seats`} />
        </dl>

        {/* Rate */}
        <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            ₱{vehicle.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            <span className="text-sm font-normal text-gray-500">/day</span>
          </span>
        </div>

        {/* Book Now button */}
        <button
          onClick={onBook}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Vehicle["status"] }) {
  const styles: Record<Vehicle["status"], string> = {
    available: "bg-green-100 text-green-700",
    rented: "bg-blue-100 text-blue-700",
    maintenance: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
