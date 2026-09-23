"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, uploadProfilePhoto } from "@/features/profile/api/profile.api";
import type { CustomerProfile } from "@/features/profile/types";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type FieldErrors = {
  name?: string;
  username?: string;
  email?: string;
};

type EditProfileDialogProps = {
  profile: CustomerProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the updated profile so the page can refresh instantly. */
  onSaved: (updated: CustomerProfile) => void;
};

/**
 * Customer-facing edit-profile form.
 *
 * The photo is sent as a real multipart file to the backend upload endpoint →
 * Cloudinary; only the returned secure_url is stored in the existing
 * profilepic field. There is deliberately NO "profile picture URL" input.
 *
 * The form component only mounts while the dialog is open, so its state is
 * always seeded fresh from the latest profile on every open.
 */
export function EditProfileDialog({
  profile,
  open,
  onOpenChange,
  onSaved,
}: EditProfileDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your name, username and profile photo.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ProfileEditForm
            profile={profile}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProfileEditForm({
  profile,
  onOpenChange,
  onSaved,
}: {
  profile: CustomerProfile;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: CustomerProfile) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(profile.name);
  const [username, setUsername] = React.useState(profile.username);
  const [email, setEmail] = React.useState(profile.email);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  // Always release the local preview blob URL.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset so picking the same file again re-triggers onChange.
    event.target.value = "";
    if (!chosen) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(chosen.type)) {
      toast.error("Unsupported file", {
        description: "Please choose a PNG, JPG or WEBP image.",
      });
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large", {
        description: "Please choose an image smaller than 5 MB.",
      });
      return;
    }

    setFile(chosen);
    setUploadedUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(chosen);
    });
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (username.trim().length < 3) {
      next.username = "Username must be at least 3 characters";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // 1. Upload the selected photo first (only when one was chosen and it
      //    hasn't been uploaded during a previous attempt).
      let profilepic: string | undefined;
      if (file) {
        profilepic = uploadedUrl ?? (await uploadProfilePhoto(file));
        setUploadedUrl(profilepic);
      }

      // 2. Save the text fields + Cloudinary URL to the existing profile field.
      const updated = await updateProfile({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        ...(profilepic ? { profilepic } : {}),
      });

      // 3. Refresh the profile screen, close, confirm.
      onSaved(updated);
      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't update profile", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const displayPhoto = previewUrl ?? profile.profilepic ?? undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Profile picture — file upload only, never a URL field */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Profile picture
        </Label>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {displayPhoto ? (
              <AvatarImage src={displayPhoto} alt={name.trim() || "Profile"} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
              {(name.trim() || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
              disabled={saving}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <Camera /> Upload photo
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              PNG, JPG or WEBP · up to 5 MB
            </p>
            {file ? (
              <p className="truncate text-xs text-primary">{file.name}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-profile-name"
          className="text-xs font-medium text-muted-foreground"
        >
          Full name
        </Label>
        <Input
          id="edit-profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          disabled={saving}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name}</p>
        ) : null}
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-profile-username"
          className="text-xs font-medium text-muted-foreground"
        >
          Username
        </Label>
        <Input
          id="edit-profile-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          disabled={saving}
          aria-invalid={Boolean(errors.username)}
        />
        {errors.username ? (
          <p className="text-xs text-destructive">{errors.username}</p>
        ) : null}
      </div>

      {/* Email — supported by the existing backend update endpoint */}
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-profile-email"
          className="text-xs font-medium text-muted-foreground"
        >
          Email
        </Label>
        <Input
          id="edit-profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={saving}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email}</p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
