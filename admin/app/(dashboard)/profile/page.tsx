"use client";

import { Loader2, Upload } from "lucide-react";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminProfile } from "@/lib/hooks/use-admin-profile";
import { patchJSON } from "@/lib/api/mutate";
import {
  describeUploadError,
  uploadImage,
  validateImageFile,
} from "@/lib/api/upload";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, loading, refetch } = useAdminProfile();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset so picking the same file again re-triggers onChange.
    event.target.value = "";
    if (!chosen) return;

    const invalid = validateImageFile(chosen);
    if (invalid) {
      toast.error("Invalid image", { description: invalid });
      return;
    }

    setUploading(true);
    try {
      // 1. Upload the real file → backend → Cloudinary → secure_url.
      const { url } = await uploadImage(chosen, "admin-profiles");
      // 2. Persist it in the existing admin.profilepic field through the
      //    existing authenticated profile endpoint. The identity comes from
      //    the admin session on the backend — never from the browser.
      await patchJSON("/admin/profile/api/editprofile", { profilepic: url });
      // 3. Update the preview immediately and sync the header avatar.
      setProfilepic(url);
      refetch();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error("Profile picture upload failed", {
        description: describeUploadError(err),
      });
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(name !== profile?.name ? { name } : {}),
        ...(username !== profile?.username ? { username } : {}),
        ...(email !== profile?.email ? { email } : {}),
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
          <ImageThumb
            src={profilepic}
            alt={name || "Admin"}
            className="size-20 rounded-2xl"
          />
          <div>
            <h2 className="text-lg font-bold">{name || "Admin"}</h2>
            <p className="text-xs text-muted-foreground">@{username}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
            {profile?.authprovider ?? "—"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload /> Upload image
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG or WEBP · up to 5 MB
          </p>
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