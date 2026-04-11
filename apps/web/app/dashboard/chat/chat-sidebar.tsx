"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="w-64 flex flex-col bg-muted/30">
      <div className="p-3">
        <Button onClick={onNewChat} variant="outline" className="w-full" size="sm">
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1 pb-3">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm truncate transition-colors ${
                  activeId === conv.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                {conv.title || "Untitled"}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
