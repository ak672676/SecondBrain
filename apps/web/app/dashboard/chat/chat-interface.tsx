"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";
import { ChatSidebar } from "./chat-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Source {
  documentId: string;
  documentName: string;
  chunkPreview: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const res = await fetch("/api/chat/history");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
  }

  const loadConversation = useCallback(async (convId: string) => {
    const res = await fetch(`/api/chat/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(
        (data.messages || []).map((m: { role: string; content: string; sources?: Source[] }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources || undefined,
        }))
      );
      setConversationId(convId);
    }
  }, []);

  function handleNewChat() {
    setMessages([]);
    setConversationId(null);
  }

  async function handleSend(message: string) {
    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: err.error || "Failed to get response.",
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);

          try {
            const event = JSON.parse(json);

            if (event.type === "token") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.content,
                };
                return updated;
              });
            } else if (event.type === "done") {
              setConversationId(event.conversationId);
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  sources: event.sources,
                };
                return updated;
              });
              loadConversations();
            } else if (event.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: event.message,
                };
                return updated;
              });
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection error. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
      />

      <Separator orientation="vertical" />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">Ask your knowledge base</p>
                <p className="text-sm mt-1">
                  Upload documents first, then ask questions here
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  sources={msg.sources}
                  isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      </div>
    </div>
  );
}
