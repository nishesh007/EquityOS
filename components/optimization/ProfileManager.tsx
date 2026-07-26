"use client";

import { memo, useCallback, useState } from "react";
import {
  Copy,
  Pencil,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OptimizationProfile } from "@/lib/optimization";

export interface ProfileManagerProps {
  profiles: OptimizationProfile[];
  recentProfileIds: string[];
  activeProfileId: string | null;
  error: string | null;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onLoad: (id: string) => void;
}

export const ProfileManager = memo(function ProfileManager({
  profiles,
  recentProfileIds,
  activeProfileId,
  error,
  onSave,
  onRename,
  onDuplicate,
  onDelete,
  onSetDefault,
  onLoad,
}: ProfileManagerProps) {
  const [draftName, setDraftName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const recent = recentProfileIds
    .map((id) => profiles.find((p) => p.id === id))
    .filter((p): p is OptimizationProfile => Boolean(p))
    .slice(0, 4);

  const handleSave = useCallback(() => {
    onSave(draftName);
    setDraftName("");
  }, [draftName, onSave]);

  const startRename = useCallback((profile: OptimizationProfile) => {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    onRename(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue("");
  }, [onRename, renameValue, renamingId]);

  return (
    <Card hover={false} padding="sm" data-testid="profile-manager">
      <CardHeader
        title="Optimization Profiles"
        subtitle="Reusable configurations persisted locally in this browser"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="New profile name"
          aria-label="New profile name"
          className="min-w-[160px] flex-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          Save Profile
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-loss">
          {error}
        </p>
      ) : null}

      {recent.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Recent Profiles
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {recent.map((p) => (
              <button
                key={`recent-${p.id}`}
                type="button"
                onClick={() => onLoad(p.id)}
                className="rounded-full border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:border-accent/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto" aria-label="Saved profiles">
        {profiles.map((profile) => {
          const active = profile.id === activeProfileId;
          const renaming = renamingId === profile.id;
          return (
            <li
              key={profile.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2",
                active
                  ? "border-accent/30 bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/30"
              )}
            >
              <div className="min-w-0 flex-1">
                {renaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    aria-label="Rename profile"
                    className="w-full rounded border border-surface-border-subtle bg-surface-overlay/60 px-2 py-1 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onLoad(profile.id)}
                    className="truncate text-left text-xs font-semibold text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    {profile.name}
                    {profile.isDefault ? (
                      <span className="ml-1.5 text-[10px] font-medium text-accent">
                        Default
                      </span>
                    ) : null}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Set ${profile.name} as default`}
                  onClick={() => onSetDefault(profile.id)}
                  className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      profile.isDefault && "fill-accent text-accent"
                    )}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${profile.name}`}
                  onClick={() => startRename(profile)}
                  className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Duplicate ${profile.name}`}
                  onClick={() => onDuplicate(profile.id)}
                  className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${profile.name}`}
                  onClick={() => onDelete(profile.id)}
                  disabled={profile.isDefault}
                  className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
});
