"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  FolderOpen,
  Upload,
  Trash2,
  Download,
  File,
  RefreshCw,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AnimatedContainer } from "@/components/shared/animated-container"
import { api, ApiError } from "@/lib/api"
import type { DocumentFile } from "@/types"

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.listDocuments()
      setDocuments(response.data || [])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "无法加载文档"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("name", uploadFile.name)
      await api.uploadDocument(formData)
      toast.success(`Uploaded ${uploadFile.name}`)
      setUploadOpen(false)
      setUploadFile(null)
      fetchDocuments()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "上传失败")
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    try {
      await api.deleteDocument(fileId)
      toast.success("Document deleted")
      fetchDocuments()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "删除失败"
      toast.error(message)
    }
  }

  return (
    <AnimatedContainer className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage files stored in Appwrite
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchDocuments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-9 gradient-btn">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Select file</Label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setUploadFile(f)
                    }}
                  />
                </div>
                {uploadFile && (
                  <p className="text-xs text-muted-foreground">
                    {uploadFile.name} — {formatBytes(uploadFile.size)}
                  </p>
                )}
                <Button
                  className="w-full gradient-btn"
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-5">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No documents found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload your first document
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.file_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <Card className="group glass-card border-border/40 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
                <CardContent className="p-4">
                  {/* Preview */}
                  <div className="relative mb-3 h-32 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                    {previewFileId === doc.file_id ? (
                      <img
                        src={api.getDocumentPreviewUrl(doc.file_id)}
                        alt={doc.file_name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <File className="h-10 w-10 text-muted-foreground/40" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        setPreviewFileId(
                          previewFileId === doc.file_id ? null : doc.file_id
                        )
                      }
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium truncate" title={doc.file_name}>
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-normal">
                        {doc.mime_type?.split("/")[1] || doc.mime_type}
                      </Badge>
                      <span>{formatBytes(doc.size_bytes || 0)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40">
                    <a
                      href={api.getDocumentDownloadUrl(doc.file_id)}
                      download
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(doc.file_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatedContainer>
  )
}
