"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/src/lib/api";
import type { AxiosError } from "axios";
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
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

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

  // Collect all document URLs from reservation + lines
  type Doc = { label: string; url: string };
  const rawDocs: Doc[] = [];
  if (reservation.renter_gov_id_url)
    rawDocs.push({ label: "Renter Government ID", url: reservation.renter_gov_id_url });
  if (reservation.renter_license_url)
    rawDocs.push({ label: "Renter Driver's License", url: reservation.renter_license_url });
  reservation.reservation_lines?.forEach((line, i) => {
    const tag = reservation.reservation_lines.length > 1 ? ` (Vehicle ${i + 1})` : "";
    if (line.driver_gov_id_url)
      rawDocs.push({ label: `Driver Government ID${tag}`, url: line.driver_gov_id_url });
    if (line.driver_license_url)
      rawDocs.push({ label: `Driver's License${tag}`, url: line.driver_license_url });
  });
  // Deduplicate by URL so the same file doesn't get a duplicate key warning
  const documents = Array.from(
    new Map(rawDocs.map((d) => [d.url, d])).values()
  );

  return (
    <>
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
                reservation.renter_first_name
                  ? `${reservation.renter_first_name} ${reservation.renter_last_name}`
                  : customer
                  ? `${customer.first_name} ${customer.last_name}`
                  : "—"
              }
            />
            <DetailRow
              label="Email"
              value={reservation.renter_email ?? customer?.email ?? "—"}
            />
            <DetailRow
              label="Phone"
              value={reservation.renter_phone ?? customer?.phone_number ?? "—"}
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

        {/* Documents */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Submitted Documents
          </h2>
          {documents.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              No documents submitted yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc, index) => (
                <button
                  key={`doc-${index}`}
                  onClick={() => setLightbox(doc)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 text-left transition hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                    <DocumentImage
                      filePath={doc.url}
                      alt={doc.label}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-700 leading-snug">{doc.label}</p>
                    <p className="mt-0.5 text-xs text-blue-500">Click to view</p>
                  </div>
                </button>
              ))}
            </div>
          )}
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

    {lightbox && (
      <Lightbox
        url={lightbox.url}
        label={lightbox.label}
        onClose={() => setLightbox(null)}
      />
    )}
  </>
  );
}

/* ─── DocumentImage ──────────────────────────────────────────── */

/**
 * Fetches a short-lived signed URL from the backend then renders the image.
 * Accepts either a raw storage path ("userId/123_file.jpg") or a legacy
 * full public URL — the backend normalises both.
 */
function DocumentImage({
  filePath,
  alt,
  className,
}: {
  filePath: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    console.log("[DocumentImage] file_path received:", filePath);

    api
      .post("/api/documents/signed-url", { file_path: filePath })
      .then((res) => {
        console.log("[DocumentImage] signed URL response:", res.data);
        if (!cancelled) setSrc(res.data.signedUrl);
      })
      .catch((err: AxiosError) => {
        console.error("[DocumentImage] signed URL error:", (err as AxiosError<{ error?: string }>).response?.data);
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [filePath]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-red-50 text-xs text-red-400 ${className ?? ""}`}>
        Failed to load
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className ?? ""}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

/* ─── Lightbox ───────────────────────────────────────────────── */

function Lightbox({
  url,
  label,
  onClose,
}: {
  url: string;
  label: string;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
    >
      <div className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Image */}
        <div className="overflow-auto bg-gray-50 p-4 flex items-center justify-center">
          <DocumentImage
            filePath={url}
            alt={label}
            className="max-h-[70vh] max-w-full rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
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
