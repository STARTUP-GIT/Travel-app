"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteJSON } from "@/lib/api/mutate";

/**
 * Row-level delete control for admin tables. Calls the backend DELETE endpoint
 * directly (path goes through the same direct-URL normalisation as the rest of
 * the data layer) and refreshes the list on success.
 */
export function DeleteButton({
  url,
  label = "Delete",
  confirmMessage = "This will permanently delete this record. This action cannot be undone.",
  onDeleted,
}: {
  url: string;
  label?: string;
  confirmMessage?: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteJSON(url);
      toast.success("Deleted");
      setOpen(false);
      onDeleted();
    } catch (err) {
      // The backend returns short, human messages for real conflicts (e.g. a
      // guide that still has reviews). Anything that looks like a raw server
      // fault is hidden so the admin never sees "Internal Server Error".
      const message = err instanceof Error ? err.message : undefined;
      const friendly =
        message && !/internal server error|failed \([5]\d\d\)|status 5\d\d/i.test(message)
          ? message
          : "Something went wrong. Please try again.";
      toast.error("Delete failed", { description: friendly });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? "Deleting…" : label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}