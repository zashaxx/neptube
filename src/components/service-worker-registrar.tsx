"use client";

import { useEffect } from "react";

/**
 * Registers the NepTube video cache Service Worker.
 * Place this once in your root layout or a top-level client component.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw-video-cache.js", { scope: "/" })
      .then((reg) => {
        console.log("[NepTube] Video cache SW registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[NepTube] Video cache SW registration failed:", err);
      });
  }, []);

  return null;
}
