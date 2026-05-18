"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MotionPermissionBannerProps {
  permissionState: "unknown" | "granted" | "denied";
  onRequestPermission: () => Promise<void>;
  darkMode?: boolean;
}

export function MotionPermissionBanner({
  permissionState,
  onRequestPermission,
  darkMode = true,
}: MotionPermissionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  if (dismissed || permissionState === "granted") return null;

  const handleEnable = async () => {
    setRequesting(true);
    try {
      await onRequestPermission();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className={`absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-sm z-30 rounded-xl shadow-2xl border px-4 py-3 flex items-center gap-3 ${
        darkMode
          ? "bg-gray-800 border-orange-500/60 text-gray-100"
          : "bg-white border-orange-400 text-gray-900"
      }`}
    >
      <Zap
        className={`h-5 w-5 shrink-0 ${
          darkMode ? "text-orange-400" : "text-orange-500"
        }`}
      />
      <p className='flex-1 text-sm leading-snug'>
        {permissionState === "denied"
          ? "Accès au capteur refusé. Activez-le dans les réglages."
          : "Détecter les nids-de-poule automatiquement avec le capteur."}
      </p>
      {permissionState !== "denied" && (
        <Button
          size='sm'
          onClick={handleEnable}
          disabled={requesting}
          className='shrink-0 bg-orange-600 hover:bg-orange-700 text-white text-xs px-3'
        >
          {requesting ? "…" : "Activer"}
        </Button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 p-1 rounded-full transition-colors ${
          darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
        }`}
        aria-label='Fermer'
      >
        <X className='h-4 w-4 text-gray-400' />
      </button>
    </div>
  );
}
