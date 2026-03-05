"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";
import { getSession } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase";
import type { Vehicle } from "@/src/types/vehicle";
import CustomerNavbar from "@/src/components/CustomerNavbar";

/* ─── Types ──────────────────────────────────────────────────── */

type RenterInfo = {
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  phone: string;
};

type VehicleDetail = {
  car_id: string;
  pickupTime: string;
  returnTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  isPrimaryDriver: boolean;
  driverFirstName: string;
  driverLastName: string;
  driverBirthday: string;
  driverPhone: string;
  driverEmail: string;
  driverGovIdUrl: string;
  driverLicenseUrl: string;
};

type FormData = {
  startDate: string;
  endDate: string;
  fleetCount: number;
  selectedVehicleIds: string[];
  renter: RenterInfo;
  renterGovIdUrl: string;
  renterLicenseUrl: string;
  vehicleDetails: VehicleDetail[];
  termsAgreed: boolean;
};

type DriverFiles = Record<string, { govId: File | null; license: File | null }>;

/* ─── Shared constants ───────────────────────────────────────── */

const STEP_LABELS = ["Dates", "Fleet", "Details", "Review", "Done"] as const;

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-50 disabled:text-gray-400";
const BTN_PRIMARY =
  "rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_GHOST =
  "rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none transition";

const INIT_RENTER: RenterInfo = {
  firstName: "",
  lastName: "",
  birthday: "",
  email: "",
  phone: "",
};
const INIT_FORM: FormData = {
  startDate: "",
  endDate: "",
  fleetCount: 1,
  selectedVehicleIds: [],
  renter: INIT_RENTER,
  renterGovIdUrl: "",
  renterLicenseUrl: "",
  vehicleDetails: [],
  termsAgreed: false,
};

/* ─── Utilities ──────────────────────────────────────────────── */

async function uploadFile(file: File, userId: string): Promise<string> {
  const path = `${userId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(
    1,
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    )
  );
}

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function addDay(dateStr: string): string {
  return new Date(new Date(dateStr).getTime() + 86400000)
    .toISOString()
    .split("T")[0];
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function BookingPage() {
  const router = useRouter();

  // Step
  const [step, setStep] = useState(1);

  // Form state (single object as spec requires)
  const [formData, setFormData] = useState<FormData>(INIT_FORM);

  // File objects (can't live in plain state)
  const [renterGovIdFile, setRenterGovIdFile] = useState<File | null>(null);
  const [renterLicenseFile, setRenterLicenseFile] = useState<File | null>(null);
  const [driverFiles, setDriverFiles] = useState<DriverFiles>({});

  // Async state
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [referenceCodes, setReferenceCodes] = useState<string[]>([]);

  // Fleet count (separate from formData for controlled input behaviour)
  const [fleetCount, setFleetCount] = useState<number>(1);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectionWarning, setSelectionWarning] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    const { token } = getSession();
    if (!token) router.replace("/login");
  }, [router]);

  /* Step 1 → 2 */
  async function handleStep1Next() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get(
        `/api/reservations/availability?start_date=${formData.startDate}&end_date=${formData.endDate}`
      );
      const d = res.data;
      const list: Vehicle[] = Array.isArray(d)
        ? d
        : (d?.available_cars ?? d?.data ?? d?.vehicles ?? []);
      setAvailableVehicles(list);
    } catch {
      // Fallback to all available vehicles
      try {
        const res = await api.get("/api/vehicles?status=available");
        const d = res.data;
        const list: Vehicle[] = Array.isArray(d) ? d : (d?.data ?? d?.vehicles ?? []);
        setAvailableVehicles(list);
      } catch {
        setLoadError("Failed to load available vehicles. Please try again.");
        setLoading(false);
        return;
      }
    }
    setSelectedVehicles([]);
    setFormData((p) => ({ ...p, selectedVehicleIds: [] }));
    setSelectionWarning("");
    setLoading(false);
    setStep(2);
  }

  /* Toggle vehicle checkbox in Step 2 */
  function handleVehicleToggle(v: Vehicle) {
    const isSelected = formData.selectedVehicleIds.includes(v.car_id);
    if (!isSelected && formData.selectedVehicleIds.length >= fleetCount) {
      setSelectionWarning(
        `You can only select up to ${fleetCount} vehicle${fleetCount > 1 ? "s" : ""}`
      );
      return;
    }
    setSelectionWarning("");
    if (isSelected) {
      setFormData((p) => ({
        ...p,
        selectedVehicleIds: p.selectedVehicleIds.filter((id) => id !== v.car_id),
      }));
      setSelectedVehicles((p) => p.filter((x) => x.car_id !== v.car_id));
    } else {
      setFormData((p) => ({
        ...p,
        selectedVehicleIds: [...p.selectedVehicleIds, v.car_id],
      }));
      setSelectedVehicles((p) => [...p, v]);
    }
  }

  /* Step 2 → 3: initialise vehicleDetails */
  function handleStep2Next() {
    const details: VehicleDetail[] = selectedVehicles.map((v) => {
      const existing = formData.vehicleDetails.find(
        (d) => d.car_id === v.car_id
      );
      return (
        existing ?? {
          car_id: v.car_id,
          pickupTime: "",
          returnTime: "",
          pickupLocation: "",
          dropoffLocation: "",
          isPrimaryDriver: false,
          driverFirstName: "",
          driverLastName: "",
          driverBirthday: "",
          driverPhone: "",
          driverEmail: "",
          driverGovIdUrl: "",
          driverLicenseUrl: "",
        }
      );
    });
    const files: DriverFiles = {};
    selectedVehicles.forEach((v) => {
      files[v.car_id] = driverFiles[v.car_id] ?? { govId: null, license: null };
    });
    setFormData((p) => ({ ...p, vehicleDetails: details }));
    setDriverFiles(files);
    setStep(3);
  }

  /* Update a single field in a VehicleDetail */
  function updateDetail(
    carId: string,
    field: keyof VehicleDetail,
    value: string | boolean
  ) {
    setFormData((p) => ({
      ...p,
      vehicleDetails: p.vehicleDetails.map((d) =>
        d.car_id === carId ? { ...d, [field]: value } : d
      ),
    }));
  }

  /* Toggle "primary renter is driver" */
  function togglePrimaryDriver(carId: string, checked: boolean) {
    setFormData((p) => ({
      ...p,
      vehicleDetails: p.vehicleDetails.map((d) => {
        if (d.car_id !== carId) return d;
        if (checked) {
          return {
            ...d,
            isPrimaryDriver: true,
            driverFirstName: p.renter.firstName,
            driverLastName: p.renter.lastName,
            driverBirthday: p.renter.birthday,
            driverPhone: p.renter.phone,
            driverEmail: p.renter.email,
          };
        }
        return {
          ...d,
          isPrimaryDriver: false,
          driverFirstName: "",
          driverLastName: "",
          driverBirthday: "",
          driverPhone: "",
          driverEmail: "",
          driverGovIdUrl: "",
          driverLicenseUrl: "",
        };
      }),
    }));
  }

  /* Validate Step 3 */
  function isStep3Valid(): boolean {
    const { renter, vehicleDetails, termsAgreed } = formData;
    if (
      !renter.firstName ||
      !renter.lastName ||
      !renter.birthday ||
      !renter.email ||
      !renter.phone
    )
      return false;
    if (!renterGovIdFile && !formData.renterGovIdUrl) return false;
    if (!renterLicenseFile && !formData.renterLicenseUrl) return false;
    for (const d of vehicleDetails) {
      if (
        !d.pickupTime ||
        !d.returnTime ||
        !d.pickupLocation ||
        !d.dropoffLocation ||
        !d.driverEmail
      )
        return false;
      if (!d.isPrimaryDriver) {
        const f = driverFiles[d.car_id];
        if (!f?.govId && !d.driverGovIdUrl) return false;
        if (!f?.license && !d.driverLicenseUrl) return false;
      }
    }
    return termsAgreed;
  }

  /* Step 3 → 4: upload files then advance */
  async function handleStep3Next() {
    setLoading(true);
    setUploadError("");
    try {
      const { user } = getSession();
      const userId =
        (user?.user_id as string) ?? (user?.id as string) ?? "guest";

      let renterGovIdUrl = formData.renterGovIdUrl;
      let renterLicenseUrl = formData.renterLicenseUrl;
      if (renterGovIdFile) renterGovIdUrl = await uploadFile(renterGovIdFile, userId);
      if (renterLicenseFile) renterLicenseUrl = await uploadFile(renterLicenseFile, userId);

      const updatedDetails = [...formData.vehicleDetails];
      for (let i = 0; i < updatedDetails.length; i++) {
        const d = updatedDetails[i];
        if (d.isPrimaryDriver) {
          updatedDetails[i] = {
            ...d,
            driverGovIdUrl: renterGovIdUrl,
            driverLicenseUrl: renterLicenseUrl,
          };
        } else {
          const f = driverFiles[d.car_id];
          let govIdUrl = d.driverGovIdUrl;
          let licenseUrl = d.driverLicenseUrl;
          if (f?.govId) govIdUrl = await uploadFile(f.govId, userId);
          if (f?.license) licenseUrl = await uploadFile(f.license, userId);
          updatedDetails[i] = { ...d, driverGovIdUrl: govIdUrl, driverLicenseUrl: licenseUrl };
        }
      }
      setFormData((p) => ({
        ...p,
        renterGovIdUrl,
        renterLicenseUrl,
        vehicleDetails: updatedDetails,
      }));
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed.";
      setUploadError(msg + " Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* Step 4 confirm */
  async function handleConfirmBooking() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const lines = formData.vehicleDetails.map((detail) => ({
        car_id: detail.car_id,
        start_date: formData.startDate,
        start_time: detail.pickupTime,
        end_date: formData.endDate,
        end_time: detail.returnTime,
        pickup_location: detail.pickupLocation,
        dropoff_location: detail.dropoffLocation,
        driver_first_name: detail.driverFirstName,
        driver_last_name: detail.driverLastName,
        driver_birthday: detail.driverBirthday,
        driver_phone: detail.driverPhone,
        driver_email: detail.driverEmail,
        driver_gov_id_url: detail.driverGovIdUrl,
        driver_license_url: detail.driverLicenseUrl,
        driver_is_renter: detail.isPrimaryDriver,
      }));

      const payload = {
        renter_first_name: formData.renter.firstName,
        renter_last_name: formData.renter.lastName,
        renter_birthday: formData.renter.birthday,
        renter_email: formData.renter.email,
        renter_phone: formData.renter.phone,
        renter_gov_id_url: formData.renterGovIdUrl,
        renter_license_url: formData.renterLicenseUrl,
        lines,
      };

      const res = await api.post("/api/reservations", payload);
      const code = res.data?.reservation?.reference_code ?? "";
      setReferenceCodes(code ? [code] : []);
      setStep(5);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        "Booking failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const days = calcDays(formData.startDate, formData.endDate);

  return (
    <>
      <CustomerNavbar />
      <main className="min-h-screen bg-gray-50 pt-16">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <StepIndicator current={step} />

          {step === 1 && (
            <Step1
              formData={formData}
              setFormData={setFormData}
              fleetCount={fleetCount}
              setFleetCount={setFleetCount}
              today={today}
              onNext={handleStep1Next}
              loading={loading}
              error={loadError}
            />
          )}
          {step === 2 && (
            <Step2
              availableVehicles={availableVehicles}
              selectedIds={formData.selectedVehicleIds}
              fleetCount={fleetCount}
              warning={selectionWarning}
              onToggle={handleVehicleToggle}
              onBack={() => setStep(1)}
              onNext={handleStep2Next}
            />
          )}
          {step === 3 && (
            <Step3
              formData={formData}
              setFormData={setFormData}
              selectedVehicles={selectedVehicles}
              renterGovIdFile={renterGovIdFile}
              setRenterGovIdFile={setRenterGovIdFile}
              renterLicenseFile={renterLicenseFile}
              setRenterLicenseFile={setRenterLicenseFile}
              driverFiles={driverFiles}
              setDriverFiles={setDriverFiles}
              onTogglePrimaryDriver={togglePrimaryDriver}
              onUpdateDetail={updateDetail}
              onBack={() => setStep(2)}
              onNext={handleStep3Next}
              loading={loading}
              error={uploadError}
              isValid={isStep3Valid()}
              onOpenTerms={() => setTermsOpen(true)}
            />
          )}
          {step === 4 && (
            <Step4
              formData={formData}
              selectedVehicles={selectedVehicles}
              days={days}
              onBack={() => setStep(3)}
              onConfirm={handleConfirmBooking}
              submitting={submitting}
              error={submitError}
            />
          )}
          {step === 5 && <Step5 referenceCodes={referenceCodes} />}
        </div>
      </main>

      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </>
  );
}

/* ─── Step Indicator ─────────────────────────────────────────── */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-start">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n === current;
          const done = n < current;
          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${done || active ? "bg-blue-500" : "bg-gray-200"}`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-blue-600 text-white"
                      : done
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${done ? "bg-blue-500" : "bg-gray-200"}`}
                  />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  active ? "text-blue-600" : done ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shared helpers ─────────────────────────────────────────── */

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && (
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({hint})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

/* ─── STEP 1 — Dates & Fleet Count ──────────────────────────── */

function Step1({
  formData,
  setFormData,
  fleetCount,
  setFleetCount,
  today,
  onNext,
  loading,
  error,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  fleetCount: number;
  setFleetCount: (n: number) => void;
  today: string;
  onNext: () => void;
  loading: boolean;
  error: string;
}) {
  const [inputVal, setInputVal] = useState(String(fleetCount));
  const minEnd = formData.startDate ? addDay(formData.startDate) : today;
  const valid = !!(formData.startDate && formData.endDate && fleetCount >= 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Date Range &amp; Fleet Size
      </h2>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Choose your rental period and how many vehicles you need.
      </p>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Start Date" required>
            <input
              type="date"
              min={today}
              value={formData.startDate}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((p) => ({
                  ...p,
                  startDate: v,
                  endDate: p.endDate && p.endDate <= v ? "" : p.endDate,
                }));
              }}
              className={INPUT}
            />
          </Field>
          <Field label="End Date" required>
            <input
              type="date"
              min={minEnd}
              value={formData.endDate}
              disabled={!formData.startDate}
              onChange={(e) =>
                setFormData((p) => ({ ...p, endDate: e.target.value }))
              }
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Number of Vehicles to Book" required hint="1 – 10">
          <input
            type="number"
            min={1}
            max={10}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              const parsed = parseInt(e.target.value, 10);
              if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                setFleetCount(parsed);
              }
            }}
            onBlur={() => {
              const parsed = parseInt(inputVal, 10);
              if (isNaN(parsed) || parsed < 1) {
                setInputVal("1");
                setFleetCount(1);
              } else if (parsed > 10) {
                setInputVal("10");
                setFleetCount(10);
              } else {
                setInputVal(String(parsed));
              }
            }}
            className={INPUT}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!valid || loading}
          className={BTN_PRIMARY + " min-w-[120px] flex items-center justify-center gap-2"}
        >
          {loading ? <Spinner /> : "Next →"}
        </button>
      </div>
    </div>
  );
}

/* ─── STEP 2 — Available Fleet ───────────────────────────────── */

function Step2({
  availableVehicles,
  selectedIds,
  fleetCount,
  warning,
  onToggle,
  onBack,
  onNext,
}: {
  availableVehicles: Vehicle[];
  selectedIds: string[];
  fleetCount: number;
  warning: string;
  onToggle: (v: Vehicle) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Select Vehicles
      </h2>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Choose up to{" "}
        <strong>{fleetCount}</strong>{" "}
        vehicle{fleetCount > 1 ? "s" : ""}.
      </p>

      {warning && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-700">
          {warning}
        </div>
      )}

      {availableVehicles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-16 text-center">
          <p className="font-medium text-slate-900">
            No available vehicles for selected dates
          </p>
          <p className="mt-1 text-sm text-slate-500">Try different dates.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {availableVehicles.map((v) => {
            const checked = selectedIds.includes(v.car_id);
            return (
              <label
                key={v.car_id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  checked
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(v)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-sm text-slate-500">{v.year}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>{v.transmission}</span>
                    <span>{v.fuel_type}</span>
                    <span>{v.capacity} seats</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    ₱{fmt(v.rate_per_day)}
                    <span className="font-normal text-slate-500">/day</span>
                  </p>
                </div>
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {v.image ? (
                    <img
                      src={v.image}
                      alt={`${v.brand} ${v.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      🚗
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className={BTN_GHOST}>
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedIds.length === 0}
          className={BTN_PRIMARY}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* ─── STEP 3 — Booking Information ───────────────────────────── */

function Step3({
  formData,
  setFormData,
  selectedVehicles,
  renterGovIdFile,
  setRenterGovIdFile,
  renterLicenseFile,
  setRenterLicenseFile,
  driverFiles,
  setDriverFiles,
  onTogglePrimaryDriver,
  onUpdateDetail,
  onBack,
  onNext,
  loading,
  error,
  isValid,
  onOpenTerms,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  selectedVehicles: Vehicle[];
  renterGovIdFile: File | null;
  setRenterGovIdFile: (f: File | null) => void;
  renterLicenseFile: File | null;
  setRenterLicenseFile: (f: File | null) => void;
  driverFiles: DriverFiles;
  setDriverFiles: React.Dispatch<React.SetStateAction<DriverFiles>>;
  onTogglePrimaryDriver: (carId: string, checked: boolean) => void;
  onUpdateDetail: (
    carId: string,
    field: keyof VehicleDetail,
    value: string | boolean
  ) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string;
  isValid: boolean;
  onOpenTerms: () => void;
}) {
  function setRenter(field: keyof RenterInfo, value: string) {
    setFormData((p) => ({
      ...p,
      renter: { ...p.renter, [field]: value },
    }));
  }

  return (
    <div className="space-y-6">
      {/* Section A: Primary Renter */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle>Primary Renter Details</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" required>
            <input
              type="text"
              value={formData.renter.firstName}
              onChange={(e) => setRenter("firstName", e.target.value)}
              className={INPUT}
              placeholder="Juan"
            />
          </Field>
          <Field label="Last Name" required>
            <input
              type="text"
              value={formData.renter.lastName}
              onChange={(e) => setRenter("lastName", e.target.value)}
              className={INPUT}
              placeholder="Dela Cruz"
            />
          </Field>
          <Field label="Birthday" required>
            <input
              type="date"
              value={formData.renter.birthday}
              onChange={(e) => setRenter("birthday", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Email Address" required>
            <input
              type="email"
              value={formData.renter.email}
              onChange={(e) => setRenter("email", e.target.value)}
              className={INPUT}
              placeholder="juan@example.com"
            />
          </Field>
          <Field label="Phone Number" required>
            <input
              type="tel"
              value={formData.renter.phone}
              onChange={(e) => setRenter("phone", e.target.value)}
              className={INPUT}
              placeholder="+63 912 345 6789"
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FileField
            label="Government-Issued ID"
            required
            file={renterGovIdFile}
            onChange={setRenterGovIdFile}
          />
          <FileField
            label="Driver's License"
            required
            file={renterLicenseFile}
            onChange={setRenterLicenseFile}
          />
        </div>
      </div>

      {/* Section B: Per-vehicle */}
      {formData.vehicleDetails.map((detail, idx) => {
        const vehicle = selectedVehicles.find((v) => v.car_id === detail.car_id);
        if (!vehicle) return null;
        const dFiles = driverFiles[detail.car_id] ?? { govId: null, license: null };

        return (
          <div
            key={detail.car_id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <SectionTitle>
              Vehicle {idx + 1} of {formData.vehicleDetails.length}
            </SectionTitle>

            {/* Vehicle summary */}
            <div className="mb-5 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {vehicle.brand} {vehicle.model} ({vehicle.year})
                </p>
                <p className="text-sm text-slate-500">
                  Plate: {vehicle.plate_number}
                </p>
              </div>
              <p className="text-sm font-bold text-blue-600">
                ₱{fmt(vehicle.rate_per_day)}/day
              </p>
            </div>

            {/* Dates (read-only) + times */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup Date">
                <input
                  type="date"
                  value={formData.startDate}
                  readOnly
                  className={INPUT}
                />
              </Field>
              <Field label="Return Date">
                <input
                  type="date"
                  value={formData.endDate}
                  readOnly
                  className={INPUT}
                />
              </Field>
              <Field label="Pickup Time" required>
                <input
                  type="time"
                  value={detail.pickupTime}
                  onChange={(e) =>
                    onUpdateDetail(detail.car_id, "pickupTime", e.target.value)
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Return Time" required>
                <input
                  type="time"
                  value={detail.returnTime}
                  onChange={(e) =>
                    onUpdateDetail(detail.car_id, "returnTime", e.target.value)
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Pickup Location" required>
                <input
                  type="text"
                  value={detail.pickupLocation}
                  onChange={(e) =>
                    onUpdateDetail(detail.car_id, "pickupLocation", e.target.value)
                  }
                  placeholder="e.g. NAIA Terminal 1"
                  className={INPUT}
                />
              </Field>
              <Field label="Drop-off Location" required>
                <input
                  type="text"
                  value={detail.dropoffLocation}
                  onChange={(e) =>
                    onUpdateDetail(detail.car_id, "dropoffLocation", e.target.value)
                  }
                  placeholder="e.g. BGC, Taguig"
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Driver details */}
            <div className="mt-5 border-t border-gray-100 pt-5">
              <SectionTitle>Driver Details</SectionTitle>
              <label className="mb-4 flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={detail.isPrimaryDriver}
                  onChange={(e) =>
                    onTogglePrimaryDriver(detail.car_id, e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">
                  Primary renter is the driver
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Driver First Name" required>
                  <input
                    type="text"
                    value={detail.driverFirstName}
                    readOnly={detail.isPrimaryDriver}
                    onChange={(e) =>
                      onUpdateDetail(detail.car_id, "driverFirstName", e.target.value)
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Driver Last Name" required>
                  <input
                    type="text"
                    value={detail.driverLastName}
                    readOnly={detail.isPrimaryDriver}
                    onChange={(e) =>
                      onUpdateDetail(detail.car_id, "driverLastName", e.target.value)
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Driver Birthday" required>
                  <input
                    type="date"
                    value={detail.driverBirthday}
                    readOnly={detail.isPrimaryDriver}
                    onChange={(e) =>
                      onUpdateDetail(detail.car_id, "driverBirthday", e.target.value)
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Driver Phone" required>
                  <input
                    type="tel"
                    value={detail.driverPhone}
                    readOnly={detail.isPrimaryDriver}
                    onChange={(e) =>
                      onUpdateDetail(detail.car_id, "driverPhone", e.target.value)
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Driver Email" required>
                  <input
                    type="email"
                    value={detail.driverEmail}
                    readOnly={detail.isPrimaryDriver}
                    onChange={(e) =>
                      onUpdateDetail(detail.car_id, "driverEmail", e.target.value)
                    }
                    className={INPUT}
                  />
                </Field>
              </div>

              {!detail.isPrimaryDriver && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FileField
                    label="Driver Government-Issued ID"
                    required
                    file={dFiles.govId}
                    onChange={(f) =>
                      setDriverFiles((p) => ({
                        ...p,
                        [detail.car_id]: { ...p[detail.car_id], govId: f },
                      }))
                    }
                  />
                  <FileField
                    label="Driver's License"
                    required
                    file={dFiles.license}
                    onChange={(f) =>
                      setDriverFiles((p) => ({
                        ...p,
                        [detail.car_id]: { ...p[detail.car_id], license: f },
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Terms */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={formData.termsAgreed}
            onChange={(e) =>
              setFormData((p) => ({ ...p, termsAgreed: e.target.checked }))
            }
            className="mt-0.5 h-4 w-4 accent-blue-600 shrink-0"
          />
          <span className="text-sm text-slate-700">
            I agree to the{" "}
            <button
              type="button"
              onClick={onOpenTerms}
              className="font-medium text-blue-600 underline hover:text-blue-700"
            >
              Terms and Conditions
            </button>
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className={BTN_GHOST}>
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid || loading}
          className={BTN_PRIMARY + " min-w-[140px] flex items-center justify-center gap-2"}
        >
          {loading ? (
            <>
              <Spinner /> Uploading…
            </>
          ) : (
            "Next →"
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── File field helper ──────────────────────────────────────── */

function FileField({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <Field label={label} required={required}>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50 transition">
          <span className="text-base">📎</span>
          <span className="truncate">{file ? file.name : "Choose file…"}</span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>
    </Field>
  );
}

/* ─── STEP 4 — Review ────────────────────────────────────────── */

function Step4({
  formData,
  selectedVehicles,
  days,
  onBack,
  onConfirm,
  submitting,
  error,
}: {
  formData: FormData;
  selectedVehicles: Vehicle[];
  days: number;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string;
}) {
  const subtotals = selectedVehicles.map((v) => v.rate_per_day * days);
  const total = subtotals.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Reservation Summary
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <ReviewRow label="Start Date" value={formData.startDate} />
          <ReviewRow label="End Date" value={formData.endDate} />
          <ReviewRow label="Total Days" value={`${days} day${days !== 1 ? "s" : ""}`} />
          <ReviewRow
            label="Number of Vehicles"
            value={String(selectedVehicles.length)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Renter Details
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <ReviewRow
            label="Name"
            value={`${formData.renter.firstName} ${formData.renter.lastName}`}
          />
          <ReviewRow label="Email" value={formData.renter.email} />
          <ReviewRow label="Phone" value={formData.renter.phone} />
        </div>
      </div>

      {formData.vehicleDetails.map((detail, idx) => {
        const vehicle = selectedVehicles.find((v) => v.car_id === detail.car_id);
        if (!vehicle) return null;
        const subtotal = vehicle.rate_per_day * days;
        return (
          <div
            key={detail.car_id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Vehicle {idx + 1} —{" "}
              <span className="text-blue-600">
                {vehicle.brand} {vehicle.model}
              </span>
            </h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <ReviewRow label="Plate Number" value={vehicle.plate_number} />
              <ReviewRow label="Pickup Time" value={detail.pickupTime} />
              <ReviewRow label="Return Time" value={detail.returnTime} />
              <ReviewRow label="Pickup Location" value={detail.pickupLocation} />
              <ReviewRow label="Drop-off Location" value={detail.dropoffLocation} />
              <ReviewRow
                label="Driver"
                value={`${detail.driverFirstName} ${detail.driverLastName}`}
              />
              <ReviewRow
                label="Rental Price"
                value={`₱${fmt(vehicle.rate_per_day)} × ${days} days = ₱${fmt(subtotal)}`}
              />
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Financial Summary
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₱{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Fees</span>
            <span>₱0.00</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-3 text-base font-bold text-slate-900">
            <span>Total</span>
            <span className="text-blue-600">₱{fmt(total)}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          A confirmation will be sent to your email address after submission.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className={BTN_GHOST}>
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className={BTN_PRIMARY + " min-w-[160px] flex items-center justify-center gap-2"}
        >
          {submitting ? (
            <>
              <Spinner /> Submitting…
            </>
          ) : (
            "Confirm Booking"
          )}
        </button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

/* ─── STEP 5 — Success ───────────────────────────────────────── */

function Step5({ referenceCodes }: { referenceCodes: string[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-900">
        Booking Submitted Successfully!
      </h2>

      <div className="mt-4 space-y-2">
        {referenceCodes.length > 0 ? (
          referenceCodes.map((code) => (
            <p
              key={code}
              className="font-mono text-xl font-bold tracking-widest text-blue-600"
            >
              {code}
            </p>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            Processing your reservation…
          </p>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        We will send the confirmation to your email address. Our team will
        review your booking shortly.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/my-bookings"
          className={BTN_PRIMARY}
        >
          View My Bookings
        </Link>
        <Link href="/" className={BTN_GHOST}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

/* ─── Terms Modal ────────────────────────────────────────────── */

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Terms and Conditions
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-gray-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          By renting a vehicle from us, you agree to return the vehicle in the
          same condition it was rented. Any damages will be charged accordingly.
          The renter is responsible for all traffic violations during the rental
          period. Payment must be completed before vehicle release.
        </p>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={BTN_PRIMARY}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
