import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { installAnalytics, trackRouteChange } from "@/lib/analytics";

export function AnalyticsProvider() {
  const router = useRouter();
  const lastPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    installAnalytics();
    const initial = window.location.pathname + window.location.search;
    trackRouteChange(initial);
    lastPath.current = initial;

    const unsub = router.subscribe("onResolved", () => {
      const next = window.location.pathname + window.location.search;
      if (next !== lastPath.current) {
        trackRouteChange(next, lastPath.current);
        lastPath.current = next;
      }
    });
    return () => { unsub(); };
  }, [router]);

  return null;
}
