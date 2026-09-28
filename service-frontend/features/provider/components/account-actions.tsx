"use client";

import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import {
  removeAccount,
  signOutProvider,
} from "@/features/provider/api/provider.actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { toast } from "sonner";

/** Signs the provider out through the server action, then ends the session. */
export function SignOutButton() {
  const [busy, setBusy] = React.useState(false);

  return (
    <ConfirmDialog
      title="Sign out?"
      description="You will need your email and password, or Google, to sign back in."
      confirmLabel="Sign out"
      destructive={false}
      onConfirm={async () => {
        setBusy(true);
        await signOutProvider();
        setBusy(false);
      }}
      trigger={
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start rounded-full sm:w-auto"
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
        </Button>
      }
    />
  );
}

/** Permanently deletes the account after an explicit confirmation. */
export function DeleteAccountButton() {
  const [busy, setBusy] = React.useState(false);

  return (
    <ConfirmDialog
      title="Delete your account permanently?"
      description="This removes your profile, your listings, and every request travellers sent you. It cannot be undone."
      confirmLabel="Delete everything"
      onConfirm={async () => {
        setBusy(true);
        const result = await removeAccount();
        setBusy(false);

        if (result.ok) {
          toast.success("Account deleted");
        } else {
          toast.error(result.message);
        }
      }}
      trigger={
        <Button
          type="button"
          variant="destructive"
          className="w-full justify-start rounded-full sm:w-auto"
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldAlert className="size-4" />
          )}
          Delete account
        </Button>
      }
    />
  );
}
