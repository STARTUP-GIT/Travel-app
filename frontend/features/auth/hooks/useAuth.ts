"use client";

import { useSession, signOut } from "next-auth/react";
import * as React from "react";

export function useAuth() {
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const logout = React.useCallback(() => {
    return signOut({ callbackUrl: "/" });
  }, []);

  return {
    session,
    user: isAuthenticated ? session?.user ?? null : null,
    isAuthenticated,
    isLoading,
    logout,
    backendToken: isAuthenticated ? session?.backendToken : undefined,
  };
}