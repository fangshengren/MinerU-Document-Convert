import type {
  ApiResponse,
  ConvertAndStoreResult,
  QueryRuleResult,
  SourceFile,
  ResultFile,
  DocumentFile,
  DocumentUploadResult,
  Project,
  TaskInfo,
  TaskStatus,
  ConvertUploadResult,
  ApiInfo,
} from "@/types"

// Direct Flask access (CORS configured on backend).
// Switch to "" to route through Next.js rewrite proxy instead.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

class ApiError extends Error {
  code: number
  detail: string

  constructor(message: string, code = 0, detail = "") {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.detail = detail
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { timeout?: number }
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`
  const timeout = options?.timeout || 120000 // 2 min default
  const { timeout: _, ...fetchOptions } = options || {}

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let res: Response
  try {
    res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...(options?.body instanceof FormData
          ? {} // Browser auto-sets Content-Type with boundary for multipart
          : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — the conversion may take too long. Try fewer files.", 0, "timeout")
    }
    throw new ApiError(
      "Failed to reach backend. Is Flask running on port 5000?",
      0,
      "connection"
    )
  }
  clearTimeout(timer)

  if (!res.ok) {
    // Try to parse error body as JSON
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.msg || body.message || msg
    } catch {
      const text = await res.text().catch(() => "")
      msg = text ? `${msg}: ${text.slice(0, 200)}` : msg
    }
    throw new ApiError(msg, res.status)
  }

  const json = await res.json().catch(() => {
    throw new ApiError("Invalid JSON response from backend", res.status)
  })

  if (json.code !== 0) {
    throw new ApiError(json.msg || "Backend returned an error", json.code, json.msg)
  }

  return json
}

export { ApiError }

export const api = {
  // ─── Bill Processing ───

  convertAndStore(formData: FormData) {
    return request<ConvertAndStoreResult[]>("/api/convert-and-store", {
      method: "POST",
      body: formData,
      timeout: 300000, // 5 min — MinerU conversion is slow
    })
  },

  queryRules(billType: string, companyName: string) {
    return request<QueryRuleResult[]>(
      `/api/query-rules?billType=${encodeURIComponent(billType)}&companyName=${encodeURIComponent(companyName)}`
    )
  },

  // ─── Local Files ───

  listFiles() {
    return request<SourceFile[]>("/api/files")
  },

  listResults() {
    return request<ResultFile[]>("/api/results")
  },

  uploadFiles(formData: FormData) {
    return request<{ saved: string[]; skipped: string[] }>("/api/upload", {
      method: "POST",
      body: formData,
    })
  },

  // ─── Conversion ───

  convertUpload(formData: FormData) {
    return request<{ results: ConvertUploadResult[] }>("/api/convert-upload", {
      method: "POST",
      body: formData,
      timeout: 300000,
    })
  },

  convertAll() {
    return request<{ task_id: string; files: string[] }>("/api/convert", {
      method: "POST",
    })
  },

  getTaskStatus(taskId: string) {
    return request<TaskStatus>(`/api/status/${taskId}`)
  },

  listTasks() {
    return request<TaskInfo[]>("/api/tasks")
  },

  // ─── Appwrite Documents ───

  listDocuments() {
    return request<DocumentFile[]>("/api/documents")
  },

  uploadDocument(formData: FormData) {
    return request<DocumentUploadResult>("/api/documents/upload", {
      method: "POST",
      body: formData,
    })
  },

  deleteDocument(fileId: string) {
    return request<void>(`/api/documents/${fileId}`, {
      method: "DELETE",
    })
  },

  getDocumentDownloadUrl(fileId: string) {
    return `${API_BASE}/api/documents/fileContent/${fileId}`
  },

  getDocumentPreviewUrl(fileId: string) {
    return `${API_BASE}/api/documents/${fileId}/preview`
  },

  /** Build a URL for a markdown image served from Appwrite via the backend. */
  getMarkdownImageUrl(markdownFileId: string, imageFileName: string) {
    return `${API_BASE}/api/markdown-images/${encodeURIComponent(markdownFileId)}/${encodeURIComponent(imageFileName)}`
  },

  getDocumentInfo(fileId: string) {
    return request<DocumentFile>(`/api/documents/${fileId}/info`)
  },

  // ─── Projects (grouped by markdown file ID) ───

  listProjects() {
    return request<Project[]>("/api/projects")
  },

  getProjectDownloadUrl(fileId: string) {
    return `${API_BASE}/api/projects/${fileId}/download`
  },

  deleteProject(fileId: string) {
    return request<{ deleted_images: number; deleted_original: boolean }>(
      `/api/projects/${fileId}`,
      { method: "DELETE" }
    )
  },

  getProjectPreview(fileId: string) {
    return request<{ content: string }>(`/api/projects/${fileId}/preview`)
  },

  // ─── API Info ───

  getApiInfo() {
    return request<ApiInfo>("/")
  },
}
