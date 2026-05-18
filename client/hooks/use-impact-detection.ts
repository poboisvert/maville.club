"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const IMPACT_THRESHOLD = 20; // m/s² spike above rolling baseline
const BASELINE_WINDOW = 30;  // number of samples in rolling baseline
const DEBOUNCE_MS = 3000;    // minimum ms between consecutive impacts

type PermissionState = "unknown" | "granted" | "denied";

interface ImpactDetectionResult {
  impactDetected: boolean;
  clearImpact: () => void;
  requestPermission: () => Promise<void>;
  permissionState: PermissionState;
  isSupported: boolean;
}

function getMagnitude(
  x: number | null,
  y: number | null,
  z: number | null,
): number {
  return Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);
}

function needsPermissionRequest(): boolean {
  return (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
      .requestPermission === "function"
  );
}

export function useImpactDetection(): ImpactDetectionResult {
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");
  const [impactDetected, setImpactDetected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const baselineBuffer = useRef<number[]>([]);
  const lastImpactTimestamp = useRef<number>(0);
  const listenerActive = useRef(false);

  const clearImpact = useCallback(() => {
    setImpactDetected(false);
  }, []);

  const startListening = useCallback(() => {
    if (listenerActive.current) return;
    listenerActive.current = true;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration;
      if (!acc) return;

      const mag = getMagnitude(acc.x, acc.y, acc.z);

      // Build rolling baseline
      baselineBuffer.current.push(mag);
      if (baselineBuffer.current.length > BASELINE_WINDOW) {
        baselineBuffer.current.shift();
      }

      // Need at least half the window before we start detecting
      if (baselineBuffer.current.length < BASELINE_WINDOW / 2) return;

      const baseline =
        baselineBuffer.current.reduce((a, b) => a + b, 0) /
        baselineBuffer.current.length;

      const spike = mag - baseline;
      const now = Date.now();

      if (
        spike > IMPACT_THRESHOLD &&
        now - lastImpactTimestamp.current > DEBOUNCE_MS
      ) {
        lastImpactTimestamp.current = now;
        setImpactDetected(true);
      }
    };

    window.addEventListener("devicemotion", handleMotion);

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      listenerActive.current = false;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (needsPermissionRequest()) {
      try {
        const result = await (
          DeviceMotionEvent as unknown as {
            requestPermission: () => Promise<string>;
          }
        ).requestPermission();
        if (result === "granted") {
          setPermissionState("granted");
          startListening();
        } else {
          setPermissionState("denied");
        }
      } catch {
        setPermissionState("denied");
      }
    } else {
      // Android / desktop — permission not gated; just mark granted
      setPermissionState("granted");
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof DeviceMotionEvent === "undefined") return;

    setIsSupported(true);

    // On Android (no requestPermission method), start listening immediately
    if (!needsPermissionRequest()) {
      setPermissionState("granted");
      const cleanup = startListening();
      return cleanup;
    }

    // iOS — wait for explicit user permission grant
  }, [startListening]);

  return {
    impactDetected,
    clearImpact,
    requestPermission,
    permissionState,
    isSupported,
  };
}
