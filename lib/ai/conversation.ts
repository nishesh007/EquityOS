/**
 * Persistent AI conversations — account-scoped session history.
 */

import { getOrCreateWorkspaceId } from "@/lib/ai/researchMemory";

export const CONVERSATION_STORAGE_PREFIX = "equityos:ai:conversations:";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  symbol: string | null;
  messages: ConversationMessage[];
  tags: string[];
  favorite: boolean;
  pageContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSearchOptions {
  query?: string;
  symbol?: string | null;
  tag?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(workspaceId: string): string {
  return `${CONVERSATION_STORAGE_PREFIX}${workspaceId}`;
}

function readConversations(workspaceId: string): Conversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConversations(workspaceId: string, conversations: Conversation[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(conversations));
}

export function listConversations(
  options: ConversationSearchOptions = {}
): Conversation[] {
  if (!isBrowser()) return [];

  const workspaceId = getOrCreateWorkspaceId();
  let conversations = readConversations(workspaceId);
  const query = options.query?.trim().toLowerCase();

  if (options.favoritesOnly) {
    conversations = conversations.filter((item) => item.favorite);
  }

  if (options.symbol) {
    conversations = conversations.filter(
      (item) => item.symbol?.toUpperCase() === options.symbol?.toUpperCase()
    );
  }

  if (options.tag) {
    const tag = options.tag.toLowerCase();
    conversations = conversations.filter((item) =>
      item.tags.some((value) => value.toLowerCase() === tag)
    );
  }

  if (query) {
    conversations = conversations.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.messages.some((message) => message.content.toLowerCase().includes(query)) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return conversations.slice(0, options.limit ?? 100);
}

export function getConversation(id: string): Conversation | null {
  if (!isBrowser()) return null;
  const workspaceId = getOrCreateWorkspaceId();
  return readConversations(workspaceId).find((item) => item.id === id) ?? null;
}

export function createConversation(input: {
  title?: string;
  symbol?: string | null;
  pageContext?: string | null;
  tags?: string[];
}): Conversation | null {
  if (!isBrowser()) return null;

  const workspaceId = getOrCreateWorkspaceId();
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: createId("conv"),
    workspaceId,
    title: input.title?.trim() || "New conversation",
    symbol: input.symbol ?? null,
    messages: [],
    tags: input.tags ?? [],
    favorite: false,
    pageContext: input.pageContext ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const conversations = readConversations(workspaceId);
  writeConversations(workspaceId, [conversation, ...conversations].slice(0, 200));
  return conversation;
}

export function appendConversationMessages(
  conversationId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Conversation | null {
  if (!isBrowser() || messages.length === 0) return null;

  const workspaceId = getOrCreateWorkspaceId();
  const conversations = readConversations(workspaceId);
  let updated: Conversation | null = null;

  const next = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;

    const appended: ConversationMessage[] = messages.map((message) => ({
      id: createId("msg"),
      role: message.role,
      content: message.content.trim(),
      createdAt: new Date().toISOString(),
    }));

    const firstUser = messages.find((message) => message.role === "user");
    updated = {
      ...conversation,
      title:
        conversation.messages.length === 0 && firstUser
          ? firstUser.content.slice(0, 72)
          : conversation.title,
      messages: [...conversation.messages, ...appended].slice(-100),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) return null;
  writeConversations(workspaceId, next);
  return updated;
}

export function renameConversation(id: string, title: string): Conversation | null {
  if (!isBrowser()) return null;
  const workspaceId = getOrCreateWorkspaceId();
  let updated: Conversation | null = null;

  const next = readConversations(workspaceId).map((conversation) => {
    if (conversation.id !== id) return conversation;
    updated = {
      ...conversation,
      title: title.trim() || conversation.title,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) return null;
  writeConversations(workspaceId, next);
  return updated;
}

export function deleteConversation(id: string): boolean {
  if (!isBrowser()) return false;
  const workspaceId = getOrCreateWorkspaceId();
  const conversations = readConversations(workspaceId);
  const next = conversations.filter((conversation) => conversation.id !== id);
  if (next.length === conversations.length) return false;
  writeConversations(workspaceId, next);
  return true;
}

export function toggleConversationFavorite(id: string): Conversation | null {
  if (!isBrowser()) return null;
  const workspaceId = getOrCreateWorkspaceId();
  let updated: Conversation | null = null;

  const next = readConversations(workspaceId).map((conversation) => {
    if (conversation.id !== id) return conversation;
    updated = {
      ...conversation,
      favorite: !conversation.favorite,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) return null;
  writeConversations(workspaceId, next);
  return updated;
}

export function getOrCreateActiveConversation(input: {
  conversationId?: string;
  symbol?: string | null;
  pageContext?: string | null;
}): Conversation | null {
  if (!isBrowser()) return null;

  if (input.conversationId) {
    const existing = getConversation(input.conversationId);
    if (existing) return existing;
  }

  return createConversation({
    symbol: input.symbol,
    pageContext: input.pageContext,
  });
}
