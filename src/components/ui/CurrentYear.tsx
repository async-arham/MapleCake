"use client";

import { useEffect, useState } from "react";

/**
 * The current year on the visitor's own calendar. It shows the server's year first, corrects itself as soon
 * as the page loads, and keeps checking every minute, so it flips at midnight on 1 January even if the
 * page is left open.
 */
export function CurrentYear({ initial }: { initial: number }) {
  const [year, setYear] = useState(initial);
  useEffect(() => {
    const update = () => setYear(new Date().getFullYear());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  return <>{year}</>;
}
