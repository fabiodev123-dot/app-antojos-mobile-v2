"use client";

import { useEffect } from "react";
import { ensureSeeded } from "@/lib/storage/seed";
import { bumpStorageVersion } from "@/hooks/use-storage-version";

export function useSeed(): void {
  useEffect(() => {
    ensureSeeded();
    bumpStorageVersion();
  }, []);
}