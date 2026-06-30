"use client";
import { useEffect } from "react";
import { beaconEvent } from "@/lib/track";

// Records one VISIT ("click") per page mount. Always mounted on every landing, independent
// of Facebook-pixel config. Renders nothing.
export function VisitBeacon() {
  useEffect(() => {
    beaconEvent("visit");
  }, []);
  return null;
}
