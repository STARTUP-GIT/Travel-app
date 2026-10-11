"use client";

import * as React from "react";
import { getProfile } from "../api/profile.api";
import type { CustomerProfile } from "../types";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ProfileContextType {
  profile: CustomerProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setProfile: (profile: CustomerProfile | null) => void;
}

const ProfileContext = React.createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchProfile = React.useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load profile"));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!authLoading) {
      void fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading: authLoading || isLoading,
        error,
        refetch: fetchProfile,
        setProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = React.useContext(ProfileContext);
  if (!context) {
    const [fallbackProfile, setFallbackProfile] = React.useState<CustomerProfile | null>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      let active = true;
      getProfile()
        .then((p) => {
          if (active) setFallbackProfile(p);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []);

    return {
      profile: fallbackProfile,
      data: fallbackProfile,
      isLoading: loading,
      error: null,
      refetch: async () => {},
      setProfile: setFallbackProfile,
    };
  }

  return {
    ...context,
    data: context.profile,
  };
}
