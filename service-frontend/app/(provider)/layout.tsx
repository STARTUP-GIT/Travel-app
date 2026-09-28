import { AppShell } from "@/components/shared/app-shell";
import { loadPendingCount } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";

/**
 * Every signed-in screen lives under this layout, which also resolves the
 * session once for the whole app. A session that exists but carries no backend
 * token cannot call anything, so it is sent back to the sign-in screen instead
 * of rendering an app that would fail on the first request.
 */
export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireProviderSession();

  // A provider with no listings or requests yet must still get a working app.
  const pendingRequests = await loadPendingCount().catch(() => 0);

  return (
    <AppShell
      identity={{
        kind: session.kind,
        name: session.name,
        email: session.email,
        image: session.image,
        pendingRequests,
      }}
    >
      {children}
    </AppShell>
  );
}
