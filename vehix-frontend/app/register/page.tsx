"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/src/lib/api";

const INPUT_BASE =
  "w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const INPUT_NORMAL = `${INPUT_BASE} border-gray-300`;
const INPUT_ERROR = `${INPUT_BASE} border-red-400 bg-red-50`;

type Fields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function validate(f: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!f.firstName.trim()) errors.firstName = "First name is required.";
  if (!f.lastName.trim()) errors.lastName = "Last name is required.";
  if (!f.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!f.phone.trim()) errors.phone = "Phone number is required.";
  if (!f.password) {
    errors.password = "Password is required.";
  } else if (f.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!f.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (f.confirmPassword !== f.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(key: keyof Fields, value: string) {
    setFields((p) => ({ ...p, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((p) => ({ ...p, [key]: undefined }));
    if (apiError) setApiError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    const errors = validate(fields);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        first_name: fields.firstName.trim(),
        last_name: fields.lastName.trim(),
        email: fields.email.trim(),
        phone_number: fields.phone.trim(),
        password: fields.password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login?registered=1"), 2000);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        "Registration failed. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Create an Account
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Join Vehix and start booking today
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {success && (
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Account created successfully! Redirecting to login…
              </div>
            )}

            {apiError && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={fields.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Juan"
                    className={fieldErrors.firstName ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={fields.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Dela Cruz"
                    className={fieldErrors.lastName ? INPUT_ERROR : INPUT_NORMAL}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="juan@example.com"
                  className={fieldErrors.email ? INPUT_ERROR : INPUT_NORMAL}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={fields.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+63 912 345 6789"
                  className={fieldErrors.phone ? INPUT_ERROR : INPUT_NORMAL}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={fields.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Min. 8 characters"
                  className={fieldErrors.password ? INPUT_ERROR : INPUT_NORMAL}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={fields.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  className={fieldErrors.confirmPassword ? INPUT_ERROR : INPUT_NORMAL}
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
    </main>
  );
}
