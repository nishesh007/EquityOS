"use client";

import { cn } from "@/lib/utils";
import { Bot, Check, Copy, User } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export type ChatRole = "user" | "assistant";

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  content: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

interface MarkdownSegment {
  type: "code" | "text";
  content: string;
  language?: string;
}

function splitMarkdownSegments(content: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const fencePattern = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      language: match[1] || undefined,
      content: match[2].trimEnd(),
    });
    lastIndex = fencePattern.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content }];
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key++} className="italic text-text-secondary">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-accent"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent-muted"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function MarkdownTextBlock({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listOrdered = false;
    let key = 0;

    const flushList = () => {
      if (listItems.length === 0) return;
      const ListTag = listOrdered ? "ol" : "ul";
      elements.push(
        <ListTag
          key={key++}
          className={cn(
            "my-3 space-y-1 pl-5 text-sm text-text-secondary",
            listOrdered ? "list-decimal" : "list-disc"
          )}
        >
          {listItems.map((item, index) => (
            <li key={index}>{renderInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listOrdered = false;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const className = cn(
          "font-semibold text-text-primary",
          level === 1 && "mt-4 text-lg first:mt-0",
          level === 2 && "mt-3 text-base",
          level === 3 && "mt-2 text-sm"
        );

        if (level === 1) {
          elements.push(
            <h3 key={key++} className={className}>
              {renderInlineMarkdown(text)}
            </h3>
          );
        } else if (level === 2) {
          elements.push(
            <h4 key={key++} className={className}>
              {renderInlineMarkdown(text)}
            </h4>
          );
        } else {
          elements.push(
            <h5 key={key++} className={className}>
              {renderInlineMarkdown(text)}
            </h5>
          );
        }
        continue;
      }

      const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (unorderedMatch) {
        if (listOrdered && listItems.length > 0) flushList();
        listOrdered = false;
        listItems.push(unorderedMatch[1]);
        continue;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        if (!listOrdered && listItems.length > 0) flushList();
        listOrdered = true;
        listItems.push(orderedMatch[1]);
        continue;
      }

      flushList();
      elements.push(
        <p key={key++} className="text-sm leading-relaxed text-text-secondary">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }

    flushList();
    return elements;
  }, [content]);

  return <div className="space-y-1">{blocks}</div>;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-surface-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-surface-border-subtle bg-surface-overlay/60 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-gain" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-xs leading-relaxed text-text-secondary">
          {code}
        </code>
      </pre>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const segments = useMemo(() => splitMarkdownSegments(content), [content]);

  return (
    <div>
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <CodeBlock
            key={index}
            code={segment.content}
            language={segment.language}
          />
        ) : (
          <MarkdownTextBlock key={index} content={segment.content} />
        )
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [message.content]);

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
          <Bot className="h-4 w-4 text-accent" />
        </div>
      )}

      <div
        className={cn(
          "group relative min-w-0 max-w-[90%] md:max-w-[80%]",
          isUser && "order-first"
        )}
      >
        <div
          className={cn(
            "rounded-xl px-4 py-3",
            isUser
              ? "bg-accent text-white"
              : "glass-card border border-surface-border-subtle"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>

        {!isUser && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy message"
            className="mt-1.5 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-text-faint opacity-0 transition-all hover:bg-surface-hover hover:text-text-muted group-hover:opacity-100"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-gain" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-overlay ring-1 ring-surface-border-subtle">
          <User className="h-4 w-4 text-text-secondary" />
        </div>
      )}
    </div>
  );
}
