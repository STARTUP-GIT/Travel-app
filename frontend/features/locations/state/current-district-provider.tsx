"use client";

import * as React from "react";

type CurrentDistrictContextValue = {
  slug: string | null;
  stateSlug: string | null;
  setSlug: (slug: string) => void;
  setStateSlug: (stateSlug: string) => void;
  /** Persists the full state → district selection in one call. */
  setDestination: (stateSlug: string, districtSlug: string) => void;
};

const CurrentDistrictContext = React.createContext<CurrentDistrictContextValue>({
  slug: null,
  stateSlug: null,
  setSlug: () => {},
  setStateSlug: () => {},
  setDestination: () => {},
});

const DISTRICT_STORAGE_KEY = "kt-district";
const STATE_STORAGE_KEY = "kt-state";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

export function CurrentDistrictProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [slug, setSlugState] = React.useState<string | null>(null);
  const [stateSlug, setStateSlugState] = React.useState<string | null>(null);

  React.useEffect(() => {
    const storedDistrict = readStorage(DISTRICT_STORAGE_KEY);
    const storedState = readStorage(STATE_STORAGE_KEY);
    if (storedDistrict) setSlugState(storedDistrict);
    if (storedState) setStateSlugState(storedState);
  }, []);

  const setSlug = React.useCallback((next: string) => {
    setSlugState(next);
    writeStorage(DISTRICT_STORAGE_KEY, next);
  }, []);

  const setStateSlug = React.useCallback((next: string) => {
    setStateSlugState(next);
    writeStorage(STATE_STORAGE_KEY, next);
  }, []);

  const setDestination = React.useCallback(
    (nextStateSlug: string, nextDistrictSlug: string) => {
      setStateSlugState(nextStateSlug);
      setSlugState(nextDistrictSlug);
      writeStorage(STATE_STORAGE_KEY, nextStateSlug);
      writeStorage(DISTRICT_STORAGE_KEY, nextDistrictSlug);
    },
    []
  );

  return (
    <CurrentDistrictContext.Provider
      value={{ slug, stateSlug, setSlug, setStateSlug, setDestination }}
    >
      {children}
    </CurrentDistrictContext.Provider>
  );
}

export function useCurrentDistrict() {
  return React.useContext(CurrentDistrictContext);
}