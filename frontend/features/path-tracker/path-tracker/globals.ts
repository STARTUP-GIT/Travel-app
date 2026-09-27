/**
 * Platform shim for the ported Path Tracker.
 *
 * The original Path-Tracker is an Expo / React Native app where the bundler
 * injects a global `__DEV__` boolean. The tracking engine and the original
 * service files reference that global directly for diagnostic logging, so this
 * module provides the identical value for the customer frontend runtime and
 * declares the global type. It contains NO tracking logic.
 */

declare global {
  var __DEV__: boolean;
}

if (typeof globalThis.__DEV__ === "undefined") {
  globalThis.__DEV__ = process.env.NODE_ENV !== "production";
}

export {};
