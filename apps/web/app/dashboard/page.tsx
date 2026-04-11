import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import { UploadButton } from "./upload-button";
import { DocumentList } from "./document-list";
import { Document } from "@/lib/types";

export default async function DashboardPage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, file_type, file_size, chunk_count, status, created_at")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload and manage your knowledge base
          </p>
        </div>
        <UploadButton />
      </div>

      <DocumentList documents={(documents as Document[]) || []} />
    </div>
  );
}
