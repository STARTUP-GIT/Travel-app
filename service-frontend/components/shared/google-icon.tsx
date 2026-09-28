/** Official Google "G" mark used for "Continue with Google" buttons. */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v4.03h5.36c-.48 2.56-2.6 4.1-5.36 4.1-3.21 0-5.83-2.6-5.83-5.82s2.62-5.82 5.83-5.82c1.42 0 2.73.51 3.75 1.35l3.03-3.03C17.16 4.47 15.03 3.6 12 3.6 7.63 3.6 3.9 7.4 3.9 12s3.73 8.4 8.1 8.4c4.68 0 7.8-3.4 7.8-8.2 0-.66-.06-1.09-.15-1.6z"
      />
    </svg>
  );
}