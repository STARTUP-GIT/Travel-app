"use client";

import * as React from "react";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

type ActionState<T> = {
  run: (...args: never[]) => Promise<T | undefined>;
  runWith: (fn: () => Promise<T>) => Promise<T | undefined>;
  data: T | undefined;
  error: string | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  reset: () => void;
};

/**
 * Minimal async-action hook used by forms, dialogs and action buttons.
 * Handles loading / error / success state without duplicating logic.
 */
export function useAction<T>(action?: () => Promise<T>): ActionState<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const runWith = React.useCallback(async (fn: () => Promise<T>) => {
    setIsLoading(true);
    setError(undefined);
    setIsSuccess(false);
    try {
      const result = await fn();
      setData(result);
      setIsSuccess(true);
      return result;
    } catch (err) {
      setError(getErrorMessage(err));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const run = React.useCallback(
    (..._args: never[]) => {
      if (!action) return Promise.resolve(undefined);
      return runWith(action);
    },
    [action, runWith]
  );

  const reset = React.useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
    setIsSuccess(false);
  }, []);

  return { run, runWith, data, error, isLoading, isSuccess, reset };
}