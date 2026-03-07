"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/src/lib/auth";

const COUNTDOWN_SECONDS = 5 * 60; // 5 minutes

interface Props {
  isOpen: boolean;
  onStayLoggedIn: () => void;
}

export default function InactivityWarningModal({ isOpen, onStayLoggedIn }: Props) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  // Reset and run countdown whenever the modal opens
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      return;
    }

    setSecondsLeft(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  function handleLogoutNow() {
    clearSession();
    router.replace("/login");
  }

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        {/* Warning icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-7 w-7 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-lg font-bold text-gray-900">
          Session Expiring Soon
        </h2>

        {/* Message */}
        <p className="mb-5 text-center text-sm text-gray-500">
          You have been inactive for 25 minutes. You will be automatically
          logged out in 5 minutes.
        </p>

        {/* Countdown */}
        <div className="mb-6 flex flex-col items-center">
          <span className="text-4xl font-mono font-bold text-yellow-500">
            {minutes}:{seconds}
          </span>
          <span className="mt-1 text-xs text-gray-400">remaining</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onStayLoggedIn}
            className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition sm:w-auto"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogoutNow}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition sm:w-auto"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
