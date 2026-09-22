"use client";

import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminProfile } from "@/lib/hooks/use-admin-profile";
import { patchJSON } from "@/lib/api/mutate";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, loading } = useAdminProfile();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [profilepic, setProfilepic] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setUsername(profile.username ?? "");
      setEmail(profile.email ?? "");
      setProfilepic(profile.profilepic ?? "");
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(name !== profile?.name ? { name } : {}),
        ...(username !== profile?.username ? { username } : {}),
        ...(email !== profile?.email ? { email } : {}),
        ...(profilepic !== profile?.profilepic ? { profilepic } : {}),
        ...(password ? { password } : {}),
      };
      if (Object.keys(body).length === 0) {
        toast.info("No changes to save");
        return;
      }
      await patchJSON("/admin/profile/api/editprofile", body);
      setPassword("");
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="My profile" subtitle="Your admin account details." />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="mono-card flex flex-col items-center gap-3 p-6 text-center">
          <ImageThumb src={profile?.profilepic} alt={profile?.name ?? "Admin"} className="size-20 rounded-2xl" />
          <div>
            <h2 className="text-lg font-bold">{profile?.name ?? "Admin"}</h2>
            <p className="text-xs text-muted-foreground">@{profile?.username}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
            {profile?.authprovider ?? "—"}
          </span>
        </div>
        <form onSubmit={save} className="mono-card space-y-4 p-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Profile picture URL">
              <Input value={profilepic} onChange={(e) => setProfilepic(e.target.value)} />
            </Field>
          </div>
          <Field label="New password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep the current password"
              minLength={6}
            />
          </Field>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800" disabled={saving || loading}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}