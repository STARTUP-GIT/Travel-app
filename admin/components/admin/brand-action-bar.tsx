"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Eye, Globe2, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandActionBarProps {
  hasUnpublishedChanges: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  onDiscard?: () => void;
  saving?: boolean;
  publishing?: boolean;
  discarding?: boolean;
  disableSave?: boolean;
  saveLabel?: string;
  hidePreviewLink?: boolean;
}

export function BrandActionBar({
  hasUnpublishedChanges,
  onSave,
  onPublish,
  onDiscard,
  saving = false,
  publishing = false,
  discarding = false,
  disableSave = false,
  saveLabel = "Save Changes",
  hidePreviewLink = false,
}: BrandActionBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-3">
        {hasUnpublishedChanges ? (
          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>Unpublished Draft Changes</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Live Published & In Sync</span>
          </div>
        )}

        <span className="hidden md:inline text-xs text-muted-foreground">
          Single source of truth synced across Customer and Provider websites
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!hidePreviewLink && (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/platform/live-preview">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Live Preview</span>
            </Link>
          </Button>
        )}

        {hasUnpublishedChanges && onDiscard && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={saving || publishing || discarding}
            className="text-muted-foreground hover:text-destructive gap-1.5"
          >
            {discarding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            <span>Discard</span>
          </Button>
        )}

        {onSave && (
          <Button
            type="button"
            onClick={onSave}
            disabled={disableSave || saving || publishing}
            size="sm"
            variant="outline"
            className="gap-1.5 font-medium"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>{saveLabel}</span>
          </Button>
        )}

        {onPublish && (
          <Button
            type="button"
            onClick={onPublish}
            disabled={saving || publishing}
            size="sm"
            className="bg-[#087E8B] hover:bg-[#066873] text-white gap-1.5 font-semibold shadow-xs"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Publish to Live</span>
          </Button>
        )}
      </div>
    </div>
  );
}
