"use client";

import * as React from "react";

import { adminProfileApi } from "@/lib/api/admin";
import type { AdminProfile } from "@/lib/types";

type ProfileState = {
  profile: AdminProfile | null;
  loading: boolean;
  refetch: () => void;
};

const ProfileContext = React.createContext<ProfileState | null>(null);

export function AdminProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<AdminProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    adminProfileApi
      .getProfile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        // 401 is handled globally (redirect to /login).
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  const value = React.useMemo<ProfileState>(
    () => ({
      profile,
      loading,
      refetch: () => {
        setLoading(true);
        setNonce((n) => n + 1);
      },
    }),
    [profile, loading]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useAdminProfile(): ProfileState {
  const ctx = React.useContext(ProfileContext);
  if (!ctx) {
    return { profile: null, loading: true, refetch: () => {} };
  }
  return ctx;
}