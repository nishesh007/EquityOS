"use client";

import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask anything about any listed company...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      onChange("");
    },
    [value, disabled, onSubmit, onChange]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-surface-border-subtle bg-surface/80 p-3 backdrop-blur-xl md:p-4"
    >
      <div className="mx-auto flex max-w-4xl items-end gap-2 md:gap-3">
        <div className="glass-card flex min-w-0 flex-1 items-end gap-2 p-2 md:p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Research prompt"
            className="max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-2 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send message"
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
              canSubmit
                ? "bg-accent text-white hover:bg-accent-muted"
                : "cursor-not-allowed bg-surface-overlay text-text-faint"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-4xl text-center text-[10px] text-text-faint">
        Shift + Enter for a new line. EquityOS AI can make mistakes — verify
        before investing.
      </p>
    </form>
  );
}
