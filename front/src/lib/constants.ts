export const SUPPORTED_FORMATS = [
  { ext: ".pdf", label: "PDF", mime: "application/pdf" },
  { ext: ".doc", label: "Word", mime: "application/msword" },
  { ext: ".docx", label: "Word", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { ext: ".ppt", label: "PowerPoint", mime: "application/vnd.ms-powerpoint" },
  { ext: ".pptx", label: "PowerPoint", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  { ext: ".xls", label: "Excel", mime: "application/vnd.ms-excel" },
  { ext: ".xlsx", label: "Excel", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { ext: ".png", label: "Image", mime: "image/png" },
  { ext: ".jpg", label: "Image", mime: "image/jpeg" },
  { ext: ".jpeg", label: "Image", mime: "image/jpeg" },
  { ext: ".jp2", label: "Image", mime: "image/jp2" },
  { ext: ".webp", label: "Image", mime: "image/webp" },
  { ext: ".gif", label: "Image", mime: "image/gif" },
  { ext: ".bmp", label: "Image", mime: "image/bmp" },
  { ext: ".html", label: "HTML", mime: "text/html" },
  { ext: ".htm", label: "HTML", mime: "text/html" },
  { ext: ".txt", label: "Text", mime: "text/plain" },
  { ext: ".md", label: "Markdown", mime: "text/markdown" },
] as const

export const SUPPORTED_EXTENSIONS = SUPPORTED_FORMATS.map((f) => f.ext)

/** MIME → extensions map for react-dropzone accept prop */
export const DROPZONE_ACCEPT: Record<string, string[]> = {}
for (const f of SUPPORTED_FORMATS) {
  if (!DROPZONE_ACCEPT[f.mime]) {
    DROPZONE_ACCEPT[f.mime] = []
  }
  DROPZONE_ACCEPT[f.mime].push(f.ext)
}

export const NAV_ITEMS = [
  { href: "/convert", label: "Convert & Store", icon: "Upload" },
  { href: "/query", label: "Rule Query", icon: "Search" },
  { href: "/documents", label: "Documents", icon: "FolderOpen" },
  { href: "/info", label: "API Info", icon: "Info" },
] as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_FILES = 20
