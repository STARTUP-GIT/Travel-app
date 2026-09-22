"use client";

import { useAsync } from "@/lib/hooks/use-async";
import { getProfile } from "../api/profile.api";

export function useProfile() {
  return useAsync(() => getProfile().catch(() => undefined), []);
}