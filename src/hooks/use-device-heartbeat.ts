"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const STORAGE_KEY = "antojos_device_id";

function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function useDeviceHeartbeat(appVersion = "0.1.0") {
  useEffect(() => {
    const deviceId = getDeviceId();

    function ping() {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }
      fetch("/api/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, appVersion }),
        keepalive: true,
      }).catch(() => {});
    }

    ping();
    const interval = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [appVersion]);
}