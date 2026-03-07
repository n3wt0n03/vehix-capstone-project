"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/src/lib/auth";

const WARNING_TIME = 25 * 60 * 1000; // 25 minutes
const LOGOUT_TIME = 30 * 60 * 1000;  // 30 minutes

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function useInactivityLogout() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearSession();
    setShowWarning(false);
    router.replace("/login");
  }, [router]);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
  }, []);

  const resetTimer = useCallback(() => {
    const { token } = getSession();
    if (!token) return;

    clearTimers();
    setShowWarning(false);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_TIME);

    logoutTimer.current = setTimeout(() => {
      logout();
    }, LOGOUT_TIME);
  }, [clearTimers, logout]);

  useEffect(() => {
    const { token } = getSession();
    if (!token) return;

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [resetTimer, clearTimers]);

  return { showWarning, resetTimer };
}
