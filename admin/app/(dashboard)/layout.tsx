import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { isAdminAuthenticated } from "@/lib/api/auth-helpers";
import { AdminProfileProvider } from "@/lib/hooks/use-admin-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await isAdminAuthenticated();
  if (!authorized) {
    redirect("/login");
  }

  return (
    <AdminProfileProvider>
      <div className="flex min-h-screen bg-zinc-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProfileProvider>
  );
}