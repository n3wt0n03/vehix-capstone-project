"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";
import { getSession } from "@/src/lib/auth";
import type { Reservation } from "@/src/types/reservation";

const TABS = ["All", "Pending", "Approved", "Rejected", "Completed"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  under_review: "bg-blue-100 text-blue-700",
};

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const fetchReservations = useCallback(() => {
    setLoading(true);
    api
      .get("/api/reservations")
      .then((res) => {
        const data = res.data;
        setReservations(
          Array.isArray(data) ? data : (data?.data ?? data?.reservations ?? [])
        );
      })
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, []);

  // Auth guard
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
      return;
    }
    fetchReservations();
  }, [router, fetchReservations]);

  const filtered =
    activeTab === "All"
      ? reservations
      : reservations.filter(
          (r) => r.status.toLowerCase() === activeTab.toLowerCase()
        );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Reservations
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage all customer booking requests.
            </p>
          </div>
          <button
            onClick={fetchReservations}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
          {TABS.map((tab) => {
            const count =
              tab === "All"
                ? reservations.length
                : reservations.filter(
                    (r) => r.status.toLowerCase() === tab.toLowerCase()
                  ).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition focus:outline-none ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-500">
                Loading reservations…
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-lg font-medium text-gray-900">
                No reservations found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab !== "All"
                  ? `There are no ${activeTab.toLowerCase()} reservations.`
                  : "No reservations have been made yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Reference",
                      "Customer",
                      "Vehicle",
                      "Start Date",
                      "End Date",
                      "Total Price",
                      "Status",
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
                  {filtered.map((r) => (
                    <ReservationRow
                      key={r.reservation_id}
                      reservation={r}
                      onView={() =>
                        router.push(
                          `/dashboard/reservations/${r.reservation_id}`
                        )
                      }
                    />
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

function ReservationRow({
  reservation: r,
  onView,
}: {
  reservation: Reservation;
  onView: () => void;
}) {
  const customerName = r.user
    ? `${r.user.first_name} ${r.user.last_name}`
    : "—";
  const vehicleName = r.car ? `${r.car.brand} ${r.car.model}` : "—";
  const style = STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-900">
        {r.reference_code}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {customerName}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {vehicleName}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {formatDate(r.start_date)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        {formatDate(r.end_date)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
        ₱{r.rental_price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
        >
          {r.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <button
          onClick={onView}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
        >
          View Details
        </button>
      </td>
    </tr>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
