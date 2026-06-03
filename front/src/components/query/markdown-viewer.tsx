"use client"

import { useState } from "react"
import type { ImgHTMLAttributes, TableHTMLAttributes } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { useTheme } from "next-themes"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownViewerProps {
  content: string
  className?: string
}

// ─── rehype plugin: convert $...$ inside raw-HTML text nodes ────────────────

/**
 * After rehype-raw converts raw HTML tags into HAST elements, any $...$ math
 * sitting inside those elements is still plain text.  This plugin scans all
 * text nodes for inline-math ($...$) and display-math ($$...$$) delimiters,
 * replacing the matching spans with <code class="language-math math-inline">
 * or <pre><code class="language-math math-display"> nodes so that the
 * downstream rehype-katex plugin picks them up.
 *
 * Math that was already processed by remark-math (i.e. outside raw HTML) is
 * already an inlineMath/math node and won't be touched.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rehypeMathInRawHtml() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // Collect sibling arrays to mutate — do NOT mutate during traversal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const work: { parent: any; index: number }[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function walk(node: any, parent: any, index: number) {
      if (node.type === "text") {
        work.push({ parent, index })
      }
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          walk(node.children[i], node, i)
        }
      }
    }

    walk(tree, null, -1)

    // Process from end to start so indices stay valid.
    for (let w = work.length - 1; w >= 0; w--) {
      const { parent, index } = work[w]
      const node = parent?.children?.[index]
      if (!node || node.type !== "text") continue

      const value: string = node.value
      const replacements: Array<
        | { type: "text"; value: string }
        | { type: "inlineMath"; value: string }
        | { type: "displayMath"; value: string }
      > = []

      // Regex sources that avoid matching a lone "$" followed/preceded by space
      const inlineRe = /\$(?!\s)([^$]*?[^$\s])\$/g
      const displayRe = /\$\$([^$]+?)\$\$/g

      let lastIdx = 0

      // Build a combined match list sorted by position.
      const matches: Array<{ start: number; end: number; math: string; isDisplay: boolean }> = []

      let m: RegExpExecArray | null
      while ((m = displayRe.exec(value)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, math: m[1], isDisplay: true })
      }
      while ((m = inlineRe.exec(value)) !== null) {
        // Don't overlap with display math already matched
        const overlaps = matches.some(
          (dm) => dm.isDisplay && m!.index >= dm.start && m!.index < dm.end
        )
        if (!overlaps) {
          matches.push({ start: m.index, end: m.index + m[0].length, math: m[1], isDisplay: false })
        }
      }

      matches.sort((a, b) => a.start - b.start)

      for (const match of matches) {
        if (match.start < lastIdx) continue // overlapped, skip
        // Text before match
        if (match.start > lastIdx) {
          replacements.push({ type: "text", value: value.slice(lastIdx, match.start) })
        }
        replacements.push({
          type: match.isDisplay ? "displayMath" : "inlineMath",
          value: match.math,
        })
        lastIdx = match.end
      }

      if (lastIdx < value.length) {
        replacements.push({ type: "text", value: value.slice(lastIdx) })
      }

      if (replacements.length === 0) continue

      // Build replacement HAST nodes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newNodes: any[] = []
      for (const r of replacements) {
        if (r.type === "text") {
          newNodes.push({ type: "text", value: r.value })
        } else if (r.type === "inlineMath") {
          newNodes.push({
            type: "element",
            tagName: "code",
            properties: { className: ["language-math", "math-inline"] },
            children: [{ type: "text", value: r.value }],
          })
        } else {
          // displayMath
          newNodes.push({
            type: "element",
            tagName: "pre",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "code",
                properties: { className: ["language-math", "math-display"] },
                children: [{ type: "text", value: r.value }],
              },
            ],
          })
        }
      }

      parent.children.splice(index, 1, ...newNodes)
      // Adjust remaining work indices for this parent
      for (let x = w - 1; x >= 0; x--) {
        if (work[x].parent === parent && work[x].index > index) {
          work[x].index += newNodes.length - 1
        }
      }
    }
  }
}

// ─── Components ────────────────────────────────────────────────────────────

/** Custom <img> renderer with loading skeleton and broken-image fallback. */
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

/** Scrollable table wrapper for responsive tables. */
function TableWrapper(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50 my-4">
      <table className="min-w-full" {...props} />
    </div>
  )
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div
      className={cn(
        "markdown-content rounded-xl border border-border/40 bg-card/50 p-5 overflow-y-auto scrollbar-thin",
        className
      )}
      style={{ maxHeight: "70vh" }}
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeMathInRawHtml, rehypeKatex]}
        components={{
          img: MarkdownImage,
          table: TableWrapper,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
