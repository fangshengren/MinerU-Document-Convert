"use client"

import { useState } from "react"
import type { ImgHTMLAttributes } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownViewerProps {
  content: string
  className?: string
}

/** Custom <img> renderer with loading skeleton and broken-image fallback.
 *  Uses <span> (not <div>) because react-markdown wraps images in <p>. */
function MarkdownImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt } = props
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <span className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/40 py-8 my-3 block">
        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground/60">
          {alt || "Image unavailable"}
        </span>
      </span>
    )
  }

  return (
    <span className="block relative my-3">
      {/* Skeleton placeholder while loading */}
      {!loaded && (
        <span className="block animate-shimmer rounded-lg w-full min-h-[120px]" />
      )}
      <img
        src={src}
        alt={alt || ""}
        onLoad={() => setLoaded(true)}
        onError={() => setBroken(true)}
        className={cn(
          "max-w-full h-auto rounded-lg",
          !loaded && "absolute inset-0 opacity-0",
        )}
      />
    </span>
  )
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  return (
    <div
      className={cn(
        "markdown-content rounded-xl border border-border/40 bg-card/50 p-5 overflow-y-auto scrollbar-thin",
        className
      )}
      style={{ maxHeight: "70vh" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: MarkdownImage,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
