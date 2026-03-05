"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/src/lib/api";
import { getSession } from "@/src/lib/auth";
import type { Reservation } from "@/src/types/reservation";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  under_review: "bg-blue-100 text-blue-700",
};

type ActionStatus = "approved" | "rejected" | "completed";

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams<{ reservation_id: string }>();
  const reservation_id = params.reservation_id;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = useCallback(() => {
    setLoading(true);
    api
      .get(`/api/reservations/${reservation_id}`)
      .then((res) => {
        const data = res.data;
        setReservation(data?.data ?? data?.reservation ?? data);
      })
      .catch(() => setError("Failed to load reservation."))
      .finally(() => setLoading(false));
  }, [reservation_id]);

  // Auth guard + initial fetch
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
    fetchReservation();
  }, [router, fetchReservation]);

  async function handleStatusUpdate(newStatus: ActionStatus) {
    if (!reservation) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.patch(`/api/reservations/${reservation_id}/status`, {
        status: newStatus,
      });
      const label =
        newStatus === "approved"
          ? "Reservation approved."
          : newStatus === "rejected"
          ? "Reservation rejected."
          : "Reservation marked as completed.";
      setSuccessMsg(label);
      fetchReservation();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Action failed. Please try again.";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">
          Loading reservation…
        </span>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center">
        <p className="text-lg font-medium text-gray-900">
          {error ?? "Reservation not found"}
        </p>
        <button
          onClick={() => router.push("/dashboard/reservations")}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Back to Reservations
        </button>
      </div>
    );
  }

  const { user: customer } = reservation;
  const firstLine = reservation.reservation_lines?.[0];
  const car = firstLine?.car;

  const totalDays =
    firstLine?.start_date && firstLine?.end_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(firstLine.end_date).getTime() -
              new Date(firstLine.start_date).getTime()) /
              86400000
          )
        )
      : 1;

  const statusStyle =
    STATUS_STYLES[reservation.status] ?? "bg-gray-100 text-gray-600";

  const isPending =
    reservation.status === "pending" ||
    reservation.status === "under_review";
  const isApproved = reservation.status === "approved";
  const noActions =
    reservation.status === "rejected" ||
    reservation.status === "completed";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/reservations")}
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            ← Back to Reservations
          </button>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Vehix
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Reference Code
            </p>
            <h1 className="mt-0.5 font-mono text-2xl font-bold text-gray-900">
              {reservation.reference_code}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusStyle}`}
          >
            {reservation.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Success / error banners */}
        {successMsg && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer info */}
          <Section title="Customer Information">
            <DetailRow
              label="Full Name"
              value={
                customer
                  ? `${customer.first_name} ${customer.last_name}`
                  : "—"
              }
            />
            <DetailRow label="Email" value={customer?.email ?? "—"} />
            <DetailRow
              label="Phone"
              value={customer?.phone_number ?? "—"}
            />
          </Section>

          {/* Vehicle info */}
          <Section title="Vehicle Information">
            <DetailRow
              label="Vehicle"
              value={
                car ? `${car.brand} ${car.model} (${car.year})` : "—"
              }
            />
            <DetailRow
              label="Plate Number"
              value={car?.plate_number ?? "—"}
            />
            <DetailRow
              label="Rate per Day"
              value={
                car
                  ? `₱${car.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                  : "—"
              }
            />
          </Section>

          {/* Booking dates */}
          <Section title="Booking Details">
            <DetailRow
              label="Start Date"
              value={firstLine?.start_date ? formatDate(firstLine.start_date) : "—"}
            />
            <DetailRow
              label="End Date"
              value={firstLine?.end_date ? formatDate(firstLine.end_date) : "—"}
            />
            {firstLine?.start_time && (
              <DetailRow label="Start Time" value={firstLine.start_time} />
            )}
            {firstLine?.end_time && (
              <DetailRow label="End Time" value={firstLine.end_time} />
            )}
            <DetailRow
              label="Total Days"
              value={`${totalDays} day${totalDays !== 1 ? "s" : ""}`}
            />
            <DetailRow
              label="Total Price"
              value={`₱${(reservation.total ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}
              highlight
            />
          </Section>

          {/* Locations + meta */}
          <Section title="Locations & Metadata">
            <DetailRow
              label="Pickup Location"
              value={firstLine?.pickup_location ?? "—"}
            />
            <DetailRow
              label="Drop-off Location"
              value={firstLine?.dropoff_location ?? "—"}
            />
            <DetailRow
              label="Created At"
              value={formatDateTime(reservation.created_at)}
            />
          </Section>
        </div>

        {/* Action buttons */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Actions
          </h2>

          {noActions && (
            <p className="text-sm text-gray-500">No actions available.</p>
          )}

          {isPending && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleStatusUpdate("approved")}
                disabled={actionLoading}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Processing…" : "Approve"}
              </button>
              <button
                onClick={() => handleStatusUpdate("rejected")}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Processing…" : "Reject"}
              </button>
            </div>
          )}

          {isApproved && (
            <button
              onClick={() => handleStatusUpdate("completed")}
              disabled={actionLoading}
              className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Processing…" : "Mark as Completed"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-gray-400">{label}</dt>
      <dd
        className={`text-right font-medium ${highlight ? "text-blue-600 text-base" : "text-gray-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}
