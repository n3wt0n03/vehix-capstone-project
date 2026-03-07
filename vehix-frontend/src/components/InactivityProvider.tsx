"use client";

import { useInactivityLogout } from "@/src/hooks/useInactivityLogout";
import InactivityWarningModal from "@/src/components/InactivityWarningModal";

export default function InactivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showWarning, resetTimer } = useInactivityLogout();

  return (
    <>
      {children}
      <InactivityWarningModal
        isOpen={showWarning}
        onStayLoggedIn={resetTimer}
      />
    </>
  );
}
