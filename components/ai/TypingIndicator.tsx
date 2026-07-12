import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex max-w-[90%] items-start gap-3 md:max-w-[85%]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
        <Bot className="h-4 w-4 text-accent" />
      </div>

      <div className="glass-card px-4 py-3">
        <div className="flex items-center gap-1.5" aria-label="AI is typing">
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
