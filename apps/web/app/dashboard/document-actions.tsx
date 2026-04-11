"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DocumentActions({
  documentId,
  status,
}: {
  documentId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this document and all its chunks?")) return;

    setLoading("delete");
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReindex() {
    setLoading("reindex");
    try {
      const res = await fetch(`/api/documents/${documentId}/reindex`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const isProcessing = status === "parsing" || status === "embedding";

  return (
    <div className="flex gap-1">
      {(status === "indexed" || status === "error") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReindex}
          disabled={loading !== null}
        >
          {loading === "reindex" ? "..." : "Re-index"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={loading !== null || isProcessing}
        className="text-destructive hover:text-destructive"
      >
        {loading === "delete" ? "..." : "Delete"}
      </Button>
    </div>
  );
}
