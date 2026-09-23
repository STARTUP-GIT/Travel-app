"use client";

import { LogOut, Menu, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminProfile } from "@/lib/hooks/use-admin-profile";

export function AdminHeader() {
  const { profile } = useAdminProfile();
  const router = useRouter();

  async function signOutAdmin() {
    // NextAuth destroys the session; the browser is then redirected to the
    // login page. No request is sent to any proxy signout endpoint.
    await signOut({ callbackUrl: "/login" });
  }

  const initial = profile?.name?.charAt(0)?.toUpperCase() ?? "A";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4 backdrop-blur-md">
      {/* Mobile sidebar trigger */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
      <div className="min-w-0 flex-1" />
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Profile menu">
              <Avatar className="size-8">
                {profile?.profilepic ? <AvatarImage src={profile.profilepic} alt={profile.name} /> : null}
                <AvatarFallback className="bg-zinc-900 font-semibold text-white">{initial}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate font-medium">{profile?.name ?? "Admin"}</span>
              <span className="block truncate text-xs text-muted-foreground">{profile?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-2">
              <User className="size-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOutAdmin} className="gap-2">
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}