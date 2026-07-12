import { Card, CardHeader } from "@/components/ui/Card";
import type { CompanyNote } from "@/types";
import { StickyNote, Plus } from "lucide-react";

interface NotesTabProps {
  notes: CompanyNote[];
  symbol: string;
}

export function NotesTab({ notes, symbol }: NotesTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Research Notes"
        subtitle={`Personal notes for ${symbol}`}
        action={
          <button className="flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
            <Plus className="h-3 w-3" />
            Add Note
          </button>
        }
      />

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-overlay">
            <StickyNote className="h-6 w-6 text-text-muted" />
          </div>
          <p className="mt-4 text-sm text-text-muted">No notes yet</p>
          <p className="mt-1 text-xs text-text-faint">
            Add research notes to track your thesis on {symbol}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
            >
              <p className="text-sm leading-relaxed text-text-secondary">
                {note.content}
              </p>
              <p className="mt-2 text-[10px] text-text-faint">
                {new Date(note.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
