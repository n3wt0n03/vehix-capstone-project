"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/src/lib/api";
import type { Vehicle } from "@/src/types/vehicle";

type FormState = {
  brand: string;
  model: string;
  year: string;
  plate_number: string;
  capacity: string;
  transmission: string;
  fuel_type: string;
  rate_per_day: string;
  current_millage: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  brand: "",
  model: "",
  year: "",
  plate_number: "",
  capacity: "",
  transmission: "automatic",
  fuel_type: "gasoline",
  rate_per_day: "",
  current_millage: "0",
  status: "available",
};

function vehicleToForm(v: Vehicle): FormState {
  return {
    brand: v.brand,
    model: v.model,
    year: String(v.year),
    plate_number: v.plate_number,
    capacity: String(v.capacity),
    transmission: v.transmission,
    fuel_type: v.fuel_type,
    rate_per_day: String(v.rate_per_day),
    current_millage: String(v.current_millage),
    status: v.status,
  };
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const SELECT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function VehicleModal({
  vehicle,
  onClose,
  onSuccess,
}: {
  vehicle?: Vehicle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!vehicle;
  const [form, setForm] = useState<FormState>(
    vehicle ? vehicleToForm(vehicle) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Basic validation
    const required: (keyof FormState)[] = [
      "brand", "model", "year", "plate_number", "capacity", "rate_per_day",
    ];
    const missing = required.filter((k) => !form[k].toString().trim());
    if (missing.length > 0) {
      setError(`Please fill in all required fields: ${missing.join(", ")}`);
      return;
    }

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: parseInt(form.year, 10),
      plate_number: form.plate_number.trim(),
      capacity: parseInt(form.capacity, 10),
      transmission: form.transmission,
      fuel_type: form.fuel_type,
      rate_per_day: parseFloat(form.rate_per_day),
      current_millage: parseInt(form.current_millage || "0", 10),
      status: form.status,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/vehicles/${vehicle!.car_id}`, payload);
      } else {
        await api.post("/api/vehicles", payload);
      }
      onSuccess();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        "Failed to save vehicle. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Vehicle" : "Add New Vehicle"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand" required>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                className={INPUT}
                placeholder="e.g. Toyota"
              />
            </Field>

            <Field label="Model" required>
              <input
                type="text"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                className={INPUT}
                placeholder="e.g. Vios"
              />
            </Field>

            <Field label="Year" required>
              <input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={INPUT}
                placeholder="e.g. 2023"
              />
            </Field>

            <Field label="Plate Number" required>
              <input
                type="text"
                value={form.plate_number}
                onChange={(e) => set("plate_number", e.target.value)}
                className={INPUT}
                placeholder="e.g. ABC 1234"
              />
            </Field>

            <Field label="Capacity (seats)" required>
              <input
                type="number"
                min={1}
                max={50}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                className={INPUT}
                placeholder="e.g. 5"
              />
            </Field>

            <Field label="Rate Per Day (₱)" required>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.rate_per_day}
                onChange={(e) => set("rate_per_day", e.target.value)}
                className={INPUT}
                placeholder="e.g. 1500"
              />
            </Field>

            <Field label="Transmission">
              <select
                value={form.transmission}
                onChange={(e) => set("transmission", e.target.value)}
                className={SELECT}
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>

            <Field label="Fuel Type">
              <select
                value={form.fuel_type}
                onChange={(e) => set("fuel_type", e.target.value)}
                className={SELECT}
              >
                <option value="gasoline">Gasoline</option>
                <option value="diesel">Diesel</option>
              </select>
            </Field>

            <Field label="Current Mileage (km)">
              <input
                type="number"
                min={0}
                value={form.current_millage}
                onChange={(e) => set("current_millage", e.target.value)}
                className={INPUT}
                placeholder="e.g. 0"
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={SELECT}
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </Field>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-w-[120px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </span>
              ) : isEdit ? "Save Changes" : "Save Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
