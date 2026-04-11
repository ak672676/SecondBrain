export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  status: 'uploading' | 'parsing' | 'embedding' | 'indexed' | 'error';
  storage_path: string;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Record<string, unknown>[] | null;
  created_at: string;
}

export interface GraphNode {
  id: string;
  name: string;
  file_type: string;
  chunk_count: number;
  // D3 simulation adds these at runtime
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
