"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FolderOpen,
  Upload,
  Trash2,
  Download,
  File,
  FileText,
  ImageIcon,
  RefreshCw,
  Eye,
  ChevronRight,
  ChevronLeft,
  FolderArchive,
  Package,
  Files,
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
import { Separator } from "@/components/ui/separator"
import { AnimatedContainer } from "@/components/shared/animated-container"
import { api, ApiError } from "@/lib/api"
import type { Project, ProjectImage } from "@/types"

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ProjectDetail({
  project,
  onBack,
  onDeleteImage,
}: {
  project: Project
  onBack: () => void
  onDeleteImage: (imageFileId: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Projects
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[300px]">
            {project.file_name}
          </span>
        </div>
        <a
          href={api.getProjectDownloadUrl(project.file_id)}
          download
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium gradient-btn text-white hover:opacity-90 transition-opacity"
        >
          <Package className="h-4 w-4" />
          Download ZIP
        </a>
      </div>

      {/* Project Info Card */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{project.file_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {project.bill_type && (
                  <Badge variant="secondary" className="h-5 text-[11px] px-1.5">
                    {project.bill_type}
                  </Badge>
                )}
                {project.company_name && (
                  <Badge variant="outline" className="h-5 text-[11px] px-1.5">
                    {project.company_name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatBytes(project.size_bytes)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Tree */}
      <Card className="glass-card border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Files className="h-4 w-4" />
            File Structure
            <span className="text-xs font-normal text-muted-foreground">
              ({1 + project.images.length} files)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Markdown file */}
          <div className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors border-b border-border/30">
            <FileText className="h-5 w-5 text-primary/70 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{project.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(project.size_bytes)} · Markdown
              </p>
            </div>
            <a
              href={api.getDocumentDownloadUrl(project.file_id)}
              download
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors shrink-0"
              title="Download markdown"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>

          {/* Images folder header */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-muted/30 border-b border-border/30">
            <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">images/</p>
              <p className="text-xs text-muted-foreground">
                {project.images.length} image{project.images.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Image files */}
          <ScrollArea className="max-h-[400px]">
            {project.images.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No images in this project
              </div>
            ) : (
              project.images.map((img, i) => (
                <div
                  key={img.file_id}
                  className="flex items-center gap-3 pl-10 pr-5 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0"
                >
                  <ImageIcon className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{img.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(img.size_bytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <a
                      href={api.getMarkdownImageUrl(project.file_id, img.file_name)}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                      title="Download image"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDeleteImage(img.file_id)}
                      title="Delete image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DocumentsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.listProjects()
      setProjects(response.data || [])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "无法加载项目"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

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
      fetchProjects()
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "上传失败"
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteProject = async (fileId: string) => {
    try {
      await api.deleteDocument(fileId)
      toast.success("Project deleted")
      fetchProjects()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "删除失败"
      toast.error(message)
    }
  }

  const handleDeleteImage = async (imageFileId: string) => {
    try {
      await api.deleteDocument(imageFileId)
      toast.success("Image deleted")
      // Refresh the selected project
      fetchProjects()
      // Also update the selected project locally
      if (selectedProject) {
        setSelectedProject({
          ...selectedProject,
          images: selectedProject.images.filter((img) => img.file_id !== imageFileId),
        })
      }
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
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedProject ? "Project Detail" : "Documents"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProject
              ? "Browse files and images in this project"
              : "Projects grouped by document — each contains a markdown file and its images"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={fetchProjects}
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {selectedProject ? (
          <ProjectDetail
            key={`detail-${selectedProject.file_id}`}
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            onDeleteImage={handleDeleteImage}
          />
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </motion.div>
        ) : projects.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mb-5">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No projects found</p>
            <p className="text-xs text-muted-foreground/60 mb-4 max-w-sm">
              Use the Convert page to process documents via MinerU, or upload markdown
              files directly.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload a document
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.file_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
              >
                <Card
                  className="group glass-card border-border/40 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <CardContent className="p-4">
                    {/* Icon + type indicator */}
                    <div className="relative mb-3 h-28 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="h-12 w-12 text-primary/40" />
                        {project.images.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{project.images.length} image
                            {project.images.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5">
                      <p
                        className="text-sm font-medium truncate"
                        title={project.file_name}
                      >
                        {project.file_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {project.bill_type && (
                          <Badge
                            variant="secondary"
                            className="h-5 text-[10px] px-1.5 font-normal"
                          >
                            {project.bill_type}
                          </Badge>
                        )}
                        {project.company_name && (
                          <Badge
                            variant="outline"
                            className="h-5 text-[10px] px-1.5 font-normal"
                          >
                            {project.company_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(project.size_bytes)}
                        {project.images.length > 0 &&
                          ` · ${project.images.length} image${project.images.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={api.getProjectDownloadUrl(project.file_id)}
                        download
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                        title="Download project as ZIP"
                      >
                        <Package className="h-4 w-4" />
                      </a>
                      <a
                        href={api.getDocumentDownloadUrl(project.file_id)}
                        download
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                        title="Download markdown only"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive ml-auto"
                        onClick={() => handleDeleteProject(project.file_id)}
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedContainer>
  )
}
