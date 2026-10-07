/**
 * Authentication context.
 *
 * Owns exactly one piece of state — whether a customer session exists — plus the
 * profile that goes with it. The JWT itself lives in the secure store and is
 * never held in React state or exposed to a screen; the API client reads it
 * through `getCachedToken`.
 *
 * `status` distinguishes "checking" from "signed out" so a protected screen can
 * show a spinner instead of flashing the sign-in wall while the token is read
 * from the keystore.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import {
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  signInWithGoogle,
  type GoogleIdentity,
} from "@/services/auth.service";
import { getProfile } from "@/services/profile.service";
import { clearToken, getCachedToken, readToken } from "@/lib/storage/token-store";
import { setTokenReader, setUnauthorizedHandler } from "@/lib/api/client";
import type { CustomerProfile, SigninInput, SignupInput } from "@/types/api";

export type AuthStatus = "checking" | "signed-out" | "signed-in";

type AuthValue = {
  status: AuthStatus;
  profile: CustomerProfile | null;
  isSignedIn: boolean;
  signUp: (input: SignupInput) => Promise<void>;
  signIn: (input: SigninInput) => Promise<void>;
  signInWithGoogle: (identity: GoogleIdentity) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Called by the API client when the backend rejects the token. */
  invalidate: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Haptics are unavailable on web, where the polyfill is a no-op. */
const tapFeedback = () => {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  // Lets the 401 handler avoid re-entering the profile fetch it just triggered.
  const signingOut = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Session bootstrap                                                      */
  /* ---------------------------------------------------------------------- */

  const loadProfile = useCallback(async (): Promise<CustomerProfile | null> => {
    try {
      return await getProfile();
    } catch {
      // A profile that will not load must not block using the app: bookings,
      // listings and Saved all work without it.
      return null;
    }
  }, []);

  useEffect(() => {
    // Let the API client read the token synchronously inside a request.
    setTokenReader(getCachedToken);

    let cancelled = false;

    (async () => {
      const token = await readToken();

      if (cancelled) return;

      if (!token) {
        setStatus("signed-out");
        return;
      }

      setStatus("signed-in");
      const loaded = await loadProfile();
      if (cancelled) return;
      setProfile(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  // An expired token anywhere in the app drops the session immediately, so no
  // screen can keep showing signed-in data after the backend has rejected it.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (signingOut.current) return;
      signingOut.current = true;
      void (async () => {
        await clearToken();
        setProfile(null);
        setStatus("signed-out");
        signingOut.current = false;
      })();
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  const signUp = useCallback(async (input: SignupInput) => {
    await signUpRequest(input);
  }, []);

  const signIn = useCallback(async (input: SigninInput) => {
    await signInRequest(input);
    tapFeedback();
    setStatus("signed-in");
    setProfile(await loadProfile());
  }, [loadProfile]);

  const signInWithGoogleHandler = useCallback(
    async (identity: GoogleIdentity) => {
      await signInWithGoogle(identity);
      tapFeedback();
      setStatus("signed-in");
      setProfile(await loadProfile());
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    signingOut.current = true;
    try {
      await signOutRequest();
    } finally {
      setProfile(null);
      setStatus("signed-out");
      signingOut.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!getCachedToken()) return;
    setProfile(await loadProfile());
  }, [loadProfile]);

  const invalidate = useCallback(async () => {
    await clearToken();
    setProfile(null);
    setStatus("signed-out");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      profile,
      isSignedIn: status === "signed-in",
      signUp,
      signIn,
      signInWithGoogle: signInWithGoogleHandler,
      signOut,
      refreshProfile,
      invalidate,
    }),
    [
      status,
      profile,
      signUp,
      signIn,
      signInWithGoogleHandler,
      signOut,
      refreshProfile,
      invalidate,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return value;
}