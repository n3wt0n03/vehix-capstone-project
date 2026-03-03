"use client";

import { useEffect, useState } from "react";
import api from "@/src/lib/api";
import type { Vehicle } from "@/src/types/vehicle";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Vehicle[]>("/api/vehicles")
      .then((res) => {
        const data = res.data;
        setVehicles(Array.isArray(data) ? data : (data?.data ?? data?.vehicles ?? []));
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your vehicle fleet.
            </p>
          </div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition">
            + Add Vehicle
          </button>
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-500">
                Loading vehicles…
              </span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-lg font-medium text-gray-900">
                No vehicles found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Add a vehicle to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Brand",
                      "Model",
                      "Year",
                      "Plate Number",
                      "Type",
                      "Status",
                      "Rate / Day",
                      "Actions",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {vehicles.map((vehicle) => (
                    <VehicleRow key={vehicle.car_id} vehicle={vehicle} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
        {vehicle.brand}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {vehicle.model}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {vehicle.year}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {vehicle.plate_number}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {vehicle.fuel_type}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge status={vehicle.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        ₱{vehicle.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition">
            Edit
          </button>
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 transition">
            Delete
          </button>
        </div>
      </td>
    </tr>
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
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
