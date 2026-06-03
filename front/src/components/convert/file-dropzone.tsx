"use client"

import { useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { Upload, X, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAX_FILE_SIZE, DROPZONE_ACCEPT } from "@/lib/constants"
import { Button } from "@/components/ui/button"

interface FileDropzoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
}

export function FileDropzone({ files, onFilesChange, disabled }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], _rejected: FileRejection[]) => {
      // Filter out duplicates
      const existingNames = new Set(files.map((f) => f.name + f.size))
      const newFiles = accepted.filter((f) => !existingNames.has(f.name + f.size))
      onFilesChange([...files, ...newFiles])
    },
    [files, onFilesChange]
  )

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    maxSize: MAX_FILE_SIZE,
    accept: DROPZONE_ACCEPT,
  })

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
              isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop files here..." : "Drag & drop files, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDF, Word, PPT, Excel, Images, HTML, TXT, MD — up to{" "}
              {formatSize(MAX_FILE_SIZE)} each
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </span>
            <span className="text-muted-foreground">{formatSize(totalSize)} total</span>
          </div>
          <div className="max-h-52 space-y-1.5 overflow-y-auto scrollbar-thin">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatSize(file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
