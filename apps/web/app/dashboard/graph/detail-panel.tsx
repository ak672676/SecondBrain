"use client";

import Link from "next/link";
import { GraphNode, GraphEdge } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  md: "Markdown",
  txt: "Text",
  docx: "Word",
  csv: "CSV",
};

interface DetailPanelProps {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onClose: () => void;
}

export function DetailPanel({ node, edges, nodes, onClose }: DetailPanelProps) {
  // Find related documents sorted by similarity
  const related = edges
    .filter(
      (e) =>
        (e.source === node.id || e.target === node.id)
    )
    .map((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherId);
      return { node: otherNode, similarity: e.similarity };
    })
    .filter((r) => r.node)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return (
    <div className="w-72 border-l bg-background p-4 flex flex-col gap-4 overflow-auto">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-sm leading-tight break-words pr-2">
          {node.name}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2">
        <Badge variant="secondary">{TYPE_LABELS[node.file_type] || node.file_type}</Badge>
        <Badge variant="outline">{node.chunk_count} chunks</Badge>
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">
          Related Documents
        </h4>
        {related.length === 0 ? (
          <p className="text-xs text-muted-foreground">No connections found</p>
        ) : (
          <div className="space-y-2">
            {related.map((r) => (
              <div
                key={r.node!.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate mr-2">{r.node!.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(r.similarity * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <Link href="/dashboard/chat">
        <Button variant="outline" size="sm" className="w-full">
          Chat with this doc
        </Button>
      </Link>
    </div>
  );
}
