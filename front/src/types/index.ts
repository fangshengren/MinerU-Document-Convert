// ─── API Response ───

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
}

// ─── Convert & Store ───

export interface ConvertAndStoreResult {
  file_name: string
  md_name: string
  file_id: string
  bill_type: string
  company_name: string
  original_file_id?: string
}

// ─── Query Rules ───

export interface QueryRuleResult {
  filename: string
  content: string
}

// ─── Files ───

export interface SourceFile {
  name: string
  path: string
}

export interface ResultFile {
  name: string
  path: string
}

// ─── Documents ───

export interface DocumentFile {
  file_id: string
  file_name: string
  mime_type: string
  size_bytes: number
  created_at?: string
}

export interface DocumentUploadResult {
  file_id: string
  file_name: string
  mime_type: string
  size_bytes: number
}

// ─── Conversion Tasks ───

export interface TaskInfo {
  task_id: string
  status: string
  files: string[]
}

export interface TaskStatus extends TaskInfo {
  batch_ids: string[]
  error: string | null
}

// ─── Convert Upload ───

export interface ConvertUploadResult {
  file_name: string
  md_name: string
  md_content: string
  md_path: string
}

// ─── API Info ───

export interface ApiInfo {
  service: string
  endpoints: Record<string, string>
}
