"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/src/lib/api";
import { getSession } from "@/src/lib/auth";
import type { Vehicle } from "@/src/types/vehicle";

type FormState = {
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  pickup_location: string;
  dropoff_location: string;
};

export default function BookingPage() {
  const router = useRouter();
  const params = useParams<{ car_id: string }>();
  const car_id = params.car_id;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<FormState>({
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    pickup_location: "",
    dropoff_location: "",
  });

  // Auth guard
  useEffect(() => {
    const { token } = getSession();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // Fetch vehicle
  useEffect(() => {
    if (!car_id) return;
    api
      .get(`/api/vehicles/${car_id}`)
      .then((res) => {
        const data = res.data;
        setVehicle(data?.data ?? data?.vehicle ?? data);
      })
      .catch(() => setError("Vehicle not found."))
      .finally(() => setLoadingVehicle(false));
  }, [car_id]);

  // Redirect after success
  useEffect(() => {
    if (!referenceCode) return;
    const timer = setTimeout(() => router.push("/my-bookings"), 3000);
    return () => clearTimeout(timer);
  }, [referenceCode, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // If start date changes and end date is now before it, clear end date
      if (name === "start_date" && updated.end_date && updated.end_date <= value) {
        updated.end_date = "";
      }
      return updated;
    });
  }

  const totalDays =
    form.start_date && form.end_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(form.end_date).getTime() -
              new Date(form.start_date).getTime()) /
              86400000
          )
        )
      : 0;

  const totalPrice = vehicle ? vehicle.rate_per_day * totalDays : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post("/api/reservations", {
        car_id,
        start_date: form.start_date,
        end_date: form.end_date,
        ...(form.start_time && { start_time: form.start_time }),
        ...(form.end_time && { end_time: form.end_time }),
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
      });

      const data = res.data;
      const code =
        data?.reference_code ??
        data?.data?.reference_code ??
        data?.reservation?.reference_code ??
        "N/A";
      setReferenceCode(code);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingVehicle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">Loading vehicle…</span>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-center">
        <p className="text-lg font-medium text-gray-900">Vehicle not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-900 transition"
          >
            ← Back
          </button>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Vehix
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">
          Book a Vehicle
        </h1>

        {/* Success banner */}
        {referenceCode && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="text-lg font-semibold text-green-800">
              Booking Confirmed!
            </p>
            <p className="mt-1 text-sm text-green-700">
              Your reference code is{" "}
              <span className="font-mono font-bold">{referenceCode}</span>
            </p>
            <p className="mt-2 text-xs text-green-600">
              Redirecting to My Bookings in 3 seconds…
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left — Vehicle summary */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-44 bg-gray-100 flex items-center justify-center">
                {vehicle.image ? (
                  <img
                    src={vehicle.image}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-5xl text-gray-300">🚗</span>
                )}
              </div>
              <div className="p-5">
                <p className="text-lg font-semibold text-gray-900">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-sm text-gray-500">{vehicle.year}</p>

                <dl className="mt-4 space-y-2 text-sm">
                  <SummaryRow label="Transmission" value={vehicle.transmission} />
                  <SummaryRow label="Fuel Type" value={vehicle.fuel_type} />
                  <SummaryRow label="Capacity" value={`${vehicle.capacity} seats`} />
                  <SummaryRow
                    label="Rate per Day"
                    value={`₱${vehicle.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}
                  />
                </dl>

                {totalDays > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {totalDays} day{totalDays !== 1 ? "s" : ""} ×{" "}
                        ₱{vehicle.rate_per_day.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₱{totalPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Booking form */}
          <div className="flex-1">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5"
            >
              {/* Dates */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    min={today}
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    min={form.start_date || today}
                    value={form.end_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Locations */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="pickup_location"
                  required
                  placeholder="e.g. NAIA Terminal 1"
                  value={form.pickup_location}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Drop-off Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dropoff_location"
                  required
                  placeholder="e.g. BGC, Taguig"
                  value={form.dropoff_location}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !!referenceCode}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Confirm Booking"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}
