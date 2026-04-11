import { Document } from "@/lib/types";
import { DocumentActions } from "./document-actions";

const STATUS_COLORS: Record<string, string> = {
  uploading: "bg-yellow-100 text-yellow-800",
  parsing: "bg-blue-100 text-blue-800",
  embedding: "bg-purple-100 text-purple-800",
  indexed: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  md: "Markdown",
  txt: "Text",
  docx: "Word",
  csv: "CSV",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No documents yet</p>
        <p className="text-sm mt-1">
          Upload your first document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Name</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-left px-4 py-3 font-medium">Size</th>
            <th className="text-left px-4 py-3 font-medium">Chunks</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Uploaded</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                {doc.name}
              </td>
              <td className="px-4 py-3">
                {TYPE_LABELS[doc.file_type] || doc.file_type}
              </td>
              <td className="px-4 py-3">{formatFileSize(doc.file_size)}</td>
              <td className="px-4 py-3">{doc.chunk_count}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status] || ""}`}
                >
                  {doc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(doc.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <DocumentActions documentId={doc.id} status={doc.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
