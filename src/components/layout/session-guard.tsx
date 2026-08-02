"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Detects a session that was invalidated elsewhere (e.g. logging out from
 * another tab). SessionProvider re-fetches the session whenever the tab
 * regains focus; when it comes back empty, leave the app for the login page
 * instead of keeping stale authenticated UI around.
 */
export function SessionGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Full navigation (not router.push) so the client router cache of
      // authenticated pages is dropped along with the session.
      window.location.replace("/");
    }
  }, [status]);

  return null;
}
