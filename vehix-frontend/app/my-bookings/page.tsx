"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";
import { getSession } from "@/src/lib/auth";
import type { Reservation } from "@/src/types/reservation";

export default function MyBookingsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token, user } = getSession();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.user_roles as { role_name?: string } | undefined)
      ?.role_name;
    if (role === "admin" || role === "staff") {
      router.replace("/dashboard");
      return;
    }

    api
      .get("/api/reservations/my")
      .then((res) => {
        const data = res.data;
        setReservations(
          Array.isArray(data) ? data : (data?.data ?? data?.reservations ?? [])
        );
      })
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Vehix
          </span>
          <button
            onClick={() => router.push("/fleet")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Browse Fleet
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all your vehicle reservations.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">
              Loading bookings…
            </span>
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-900">
              No bookings yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Browse available vehicles and make your first booking.
            </p>
            <button
              onClick={() => router.push("/fleet")}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
            >
              Browse Vehicles
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => (
              <BookingCard key={r.reservation_id} reservation={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function BookingCard({ reservation: r }: { reservation: Reservation }) {
  const firstLine = r.reservation_lines?.[0];
  const lineCount = r.reservation_lines?.length ?? 0;

  const vehicleName = firstLine?.car
    ? `${firstLine.car.brand} ${firstLine.car.model} ${firstLine.car.year}`
    : "Vehicle";

  const vehicleLabel =
    lineCount > 1 ? `${vehicleName} +${lineCount - 1} more` : vehicleName;

  const formattedStart = firstLine?.start_date ? formatDate(firstLine.start_date) : "—";
  const formattedEnd = firstLine?.end_date ? formatDate(firstLine.end_date) : "—";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 tracking-wide font-mono text-sm">
              {r.reference_code}
            </p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-sm font-medium text-gray-800">{vehicleLabel}</p>
          <p className="text-sm text-gray-500">
            {formattedStart} → {formattedEnd}
          </p>
          {firstLine && (
            <p className="text-xs text-gray-400">
              {firstLine.pickup_location} → {firstLine.dropoff_location}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-gray-900">
            ₱{(r.total ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Booked {formatDate(r.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  under_review: "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
