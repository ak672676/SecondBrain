"use client";

import { Badge } from "@/components/ui/badge";

interface Source {
  documentId: string;
  documentName: string;
  chunkPreview: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  sources,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
          )}
        </div>

        {/* Source chips */}
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
            {sources.map((source, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {source.documentName}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
